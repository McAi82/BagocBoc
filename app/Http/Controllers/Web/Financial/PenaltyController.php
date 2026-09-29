<?php

namespace App\Http\Controllers\Web\Financial;

use App\Http\Controllers\Controller;
use App\Models\Penalty;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PenaltyController extends Controller
{
    use SendsNotifications;

    /**
     * Get all penalties
     */
    public function index(Request $request)
    {
        $query = Penalty::with(['resident', 'issuedBy']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->resident_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'LIKE', "%{$search}%")
                    ->orWhere('reason', 'LIKE', "%{$search}%")
                    ->orWhereHas('resident', function ($rq) use ($search) {
                        $rq->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%");
                    });
            });
        }

        $penalties = $query->latest()->paginate(15);

        return $this->respondSuccess($penalties);
    }

    /**
     * Issue penalty
     * ✅ Notifies resident immediately
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'reason' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $penalty = Penalty::create([
            'resident_id' => $request->resident_id,
            'issued_by_user_id' => Auth::id(),
            'reference_number' => $this->generateReferenceNumber(),
            'reason' => $request->reason,
            'description' => $request->description,
            'amount' => $request->amount,
            'status' => 'pending',
            'issued_at' => now(),
            'remarks' => $request->remarks,
        ]);

        // ✅ Notify resident they have a new penalty
        $this->notifyPenaltyIssued($penalty);

        return $this->respondSuccess(
            $penalty->load(['resident', 'issuedBy']),
            'Penalty issued successfully',
            201
        );
    }

    /**
     * Show penalty
     */
    public function show($id)
    {
        $penalty = Penalty::with(['resident', 'issuedBy'])->find($id);

        if (!$penalty) {
            return $this->respondNotFound('Penalty not found');
        }

        return $this->respondSuccess($penalty);
    }

    /**
     * Update penalty status
     * ✅ Notifies resident on status change
     */
    public function update(Request $request, $id)
    {
        $penalty = Penalty::find($id);

        if (!$penalty) {
            return $this->respondNotFound('Penalty not found');
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,paid,waived',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $previousStatus = $penalty->status;

        $penalty->update([
            'status' => $request->status,
            'remarks' => $request->remarks ?? $penalty->remarks,
        ]);

        if ($request->status === 'paid') {
            $penalty->update(['paid_at' => now()]);
        }

        // ✅ Only notify if status actually changed
        if ($previousStatus !== $request->status) {
            $this->notifyPenaltyStatusChanged($penalty, $previousStatus);
        }

        return $this->respondSuccess($penalty, 'Penalty updated successfully');
    }

    /**
     * Delete penalty
     */
    public function destroy($id)
    {
        $penalty = Penalty::find($id);

        if (!$penalty) {
            return $this->respondNotFound('Penalty not found');
        }

        $penalty->delete();

        return $this->respondSuccess(null, 'Penalty deleted successfully');
    }

    /**
     * Get my penalties (for mobile)
     */
    public function myPenalties()
    {
        $residentId = Auth::user()->resident_id;

        if (!$residentId) {
            return $this->respondNotFound('No resident profile found');
        }

        $penalties = Penalty::where('resident_id', $residentId)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        $totalAmount = $penalties->sum('amount');

        return $this->respondSuccess([
            'data' => $penalties,
            'total_amount' => $totalAmount,
            'count' => $penalties->count(),
        ]);
    }

    /**
     * Pay penalty (for mobile)
     */
    public function pay($id)
    {
        $penalty = Penalty::find($id);

        if (!$penalty) {
            return $this->respondNotFound('Penalty not found');
        }

        $residentId = Auth::user()->resident_id;

        if ($penalty->resident_id !== $residentId) {
            return $this->respondForbidden('You are not authorized to pay this penalty');
        }

        if ($penalty->status === 'paid') {
            return $this->respondError('This penalty has already been paid', null, 422);
        }

        $penalty->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        return $this->respondSuccess($penalty, 'Penalty paid successfully');
    }

    // ============================================
    // HELPERS
    // ============================================

    private function notifyPenaltyIssued(Penalty $penalty): void
    {
        try {
            $user = $this->getUserByResidentId($penalty->resident_id);
            if (!$user) return;

            $formattedAmount = '₱' . number_format($penalty->amount, 2);

            $this->notifyUser(
                $user->id,
                '⚠️ New Penalty Issued',
                "A penalty of {$formattedAmount} has been issued to you. Reason: {$penalty->reason}.",
                'penalty',
                'high',
                '/resident/penalties',
                Auth::id(),
                'penalty',
                $penalty->id
            );
        } catch (\Exception $e) {
            Log::error('Penalty notify issued error: ' . $e->getMessage());
        }
    }

    private function notifyPenaltyStatusChanged(Penalty $penalty, string $previousStatus): void
    {
        try {
            $user = $this->getUserByResidentId($penalty->resident_id);
            if (!$user) return;

            $titles = [
                'paid' => '✅ Penalty Settled',
                'waived' => '🎉 Penalty Waived',
                'pending' => '⚠️ Penalty Reinstated',
            ];

            $messages = [
                'paid' => "Your penalty ({$penalty->reference_number}) has been marked as paid. Thank you.",
                'waived' => "Your penalty ({$penalty->reference_number}) has been waived by the barangay.",
                'pending' => "Your penalty ({$penalty->reference_number}) is now pending again.",
            ];

            $title = $titles[$penalty->status] ?? 'Penalty Updated';
            $message = $messages[$penalty->status] ?? "Your penalty status was changed from {$previousStatus} to {$penalty->status}.";

            $this->notifyUser(
                $user->id,
                $title,
                $message,
                'penalty',
                'high',
                '/resident/penalties',
                Auth::id(),
                'penalty',
                $penalty->id
            );
        } catch (\Exception $e) {
            Log::error('Penalty notify status error: ' . $e->getMessage());
        }
    }

    private function generateReferenceNumber()
    {
        $year = date('Y');
        $prefix = 'PNL';
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $reference = "{$prefix}-{$year}-{$random}";

        while (Penalty::where('reference_number', $reference)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $reference = "{$prefix}-{$year}-{$random}";
        }

        return $reference;
    }
}
