<?php

namespace App\Http\Controllers\Web\Residents;

use App\Http\Controllers\Controller;
use App\Models\ResidentConfirmation;
use App\Models\Resident;
use App\Models\User;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ResidentConfirmationController extends Controller
{
    use SendsNotifications;

    /**
     * Get all confirmations
     */
    public function index(Request $request)
    {
        $query = ResidentConfirmation::with([
            'resident',
            'requestedBy.resident',
            'zoneLeader.resident',
        ]);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->resident_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('resident', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        $confirmations = $query->latest()->paginate(20);

        return $this->respondSuccess($confirmations);
    }

    /**
     * Request confirmation for a resident
     * ✅ Notifies the Zone Leader
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $existing = ResidentConfirmation::where('resident_id', $request->resident_id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return $this->respondError('This resident already has a pending confirmation request', null, 422);
        }

        $zoneLeaders = User::whereHas('roles', function ($q) {
            $q->where('name', 'Zone Leader');
        })->get();

        if ($zoneLeaders->isEmpty()) {
            return $this->respondError('No zone leaders available', null, 422);
        }

        $zoneLeaderId = $zoneLeaders->first()->id;

        $confirmation = ResidentConfirmation::create([
            'resident_id' => $request->resident_id,
            'requested_by_user_id' => Auth::id(),
            'zone_leader_id' => $zoneLeaderId,
            'status' => 'pending',
            'notes' => $request->notes,
        ]);

        // ✅ Notify the Zone Leader
        $resident = Resident::find($request->resident_id);
        $residentName = $resident ? "{$resident->first_name} {$resident->last_name}" : "a resident";

        $this->notifyUser(
            $zoneLeaderId,
            '🔍 Resident Confirmation Request',
            "A new resident confirmation request has been submitted for {$residentName}. Please review and confirm.",
            'confirmation',
            'high',
            '/residents/confirmations/' . $confirmation->id,
            Auth::id(),
            'resident_confirmation',
            $confirmation->id
        );

        return $this->respondSuccess(
            $confirmation->load(['resident', 'requestedBy', 'zoneLeader']),
            'Confirmation request sent to Zone Leader',
            201
        );
    }

    /**
     * Show a confirmation
     */
    public function show($id)
    {
        $confirmation = ResidentConfirmation::with([
            'resident',
            'requestedBy.resident',
            'zoneLeader.resident',
        ])->find($id);

        if (!$confirmation) {
            return $this->respondNotFound('Confirmation not found');
        }

        return $this->respondSuccess($confirmation);
    }

    /**
     * Confirm resident (Zone Leader)
     * ✅ Notifies the requester
     */
    public function confirm($id)
    {
        $confirmation = ResidentConfirmation::find($id);

        if (!$confirmation) {
            return $this->respondNotFound('Confirmation not found');
        }

        if ($confirmation->status !== 'pending') {
            return $this->respondError('This confirmation request is already processed', null, 422);
        }

        $confirmation->update([
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);

        $resident = Resident::find($confirmation->resident_id);

        // ✅ Notify requester
        $this->notifyUser(
            $confirmation->requested_by_user_id,
            '✅ Resident Confirmed',
            "The resident {$resident->first_name} {$resident->last_name} has been confirmed.",
            'confirmation',
            'normal',
            '/residents/confirmations/' . $confirmation->id,
            Auth::id(),
            'resident_confirmation',
            $confirmation->id
        );

        return $this->respondSuccess($confirmation, 'Resident confirmed successfully');
    }

    /**
     * Reject resident (Zone Leader)
     * ✅ Notifies the requester with reason
     */
    public function reject(Request $request, $id)
    {
        $confirmation = ResidentConfirmation::find($id);

        if (!$confirmation) {
            return $this->respondNotFound('Confirmation not found');
        }

        if ($confirmation->status !== 'pending') {
            return $this->respondError('This confirmation request is already processed', null, 422);
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $confirmation->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejection_reason' => $request->rejection_reason,
        ]);

        $resident = Resident::find($confirmation->resident_id);

        // ✅ Notify requester
        $this->notifyUser(
            $confirmation->requested_by_user_id,
            '❌ Resident Confirmation Rejected',
            "The resident {$resident->first_name} {$resident->last_name} was rejected. Reason: {$request->rejection_reason}",
            'confirmation',
            'high',
            '/residents/confirmations/' . $confirmation->id,
            Auth::id(),
            'resident_confirmation',
            $confirmation->id
        );

        return $this->respondSuccess($confirmation, 'Resident rejected');
    }

    /**
     * Get pending confirmations for the authenticated Zone Leader
     */
    public function myPending()
    {
        $confirmations = ResidentConfirmation::with([
            'resident',
            'requestedBy.resident',
        ])
            ->where('zone_leader_id', Auth::id())
            ->where('status', 'pending')
            ->latest()
            ->get();

        return $this->respondSuccess($confirmations);
    }

    /**
     * Get confirmation by resident ID
     */
    public function getByResident($residentId)
    {
        $confirmation = ResidentConfirmation::with([
            'resident',
            'requestedBy.resident',
            'zoneLeader.resident',
        ])
            ->where('resident_id', $residentId)
            ->latest()
            ->first();

        if (!$confirmation) {
            return $this->respondSuccess(null, 'No confirmation found');
        }

        return $this->respondSuccess($confirmation);
    }
}
