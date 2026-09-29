<?php

namespace App\Http\Controllers\Mobile\Zone;

use App\Http\Controllers\Controller;
use App\Models\ZoneCheckIn;
use App\Models\FrontDeskRequest;
use App\Models\AccountActivation;
use App\Models\Resident;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ZoneCheckInController extends Controller
{
    use SendsNotifications;

    public function index(Request $request)
    {
        $query = ZoneCheckIn::with(['zoneLeader', 'zone']);

        if ($request->has('zone_id')) {
            $query->where('zone_id', $request->zone_id);
        }

        if ($request->has('date')) {
            $query->whereDate('checked_in_at', $request->date);
        }

        $checkIns = $query->latest()->paginate(20);
        return $this->respondSuccess($checkIns);
    }

    public function stats()
    {
        try {
            $stats = [
                'pendingRequests' => FrontDeskRequest::where('status', 'pending')->count(),
                'pendingRegistrations' => AccountActivation::where('status', 'pending')->count(),
                'totalResidents' => Resident::count(),
                'totalCompliance' => 0,
            ];

            return $this->respondSuccess($stats);
        } catch (\Exception $e) {
            return $this->respondSuccess([
                'pendingRequests' => 0,
                'pendingRegistrations' => 0,
                'totalResidents' => Resident::count(),
                'totalCompliance' => 0,
            ]);
        }
    }

    /**
     * Store check-in
     * ✅ Notifies Barangay Captain / Secretary for urgent/attention findings
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'zone_id' => 'required|exists:barangay_zones,id',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'status' => 'required|in:clear,needs_attention,urgent',
            'findings' => 'nullable|string',
            'attachments' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $checkIn = ZoneCheckIn::create([
            'zone_leader_id' => Auth::id(),
            'zone_id' => $request->zone_id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'notes' => $request->notes,
            'status' => $request->status,
            'findings' => $request->findings,
            'attachments' => $request->attachments,
            'checked_in_at' => now(),
        ]);

        // ✅ Notify Captain + Secretary if attention needed or urgent
        if (in_array($request->status, ['needs_attention', 'urgent'])) {
            $zone = \App\Models\BarangayZone::find($request->zone_id);
            $zoneName = $zone ? $zone->name : "Zone #{$request->zone_id}";

            $emoji = $request->status === 'urgent' ? '🚨' : '⚠️';
            $priority = $request->status === 'urgent' ? 'high' : 'normal';

            $message = "{$zoneName}: " . ($request->findings ?: 'Needs attention');
            if ($request->notes) {
                $message .= "\n\nNotes: {$request->notes}";
            }

            $this->notifyRoles(
                ['Barangay Captain', 'Barangay Secretary'],
                "{$emoji} Zone Check-In: {$request->status}",
                $message,
                'zone',
                $priority,
                '/zone/check-ins/' . $checkIn->id,
                Auth::id()
            );
        }

        return $this->respondSuccess(
            $checkIn->load(['zoneLeader', 'zone']),
            'Check-in recorded successfully',
            201
        );
    }

    public function myCheckIns()
    {
        $checkIns = ZoneCheckIn::with(['zone'])
            ->where('zone_leader_id', Auth::id())
            ->latest()->get();

        return $this->respondSuccess($checkIns);
    }

    public function show($id)
    {
        $checkIn = ZoneCheckIn::with(['zoneLeader', 'zone'])->find($id);

        if (!$checkIn) {
            return $this->respondNotFound('Check-in not found');
        }

        return $this->respondSuccess($checkIn);
    }
}
