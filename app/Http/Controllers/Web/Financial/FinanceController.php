<?php
// app/Http/Controllers/Web/Financial/FinanceController.php

namespace App\Http\Controllers\Web\Financial;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Penalty;
use App\Models\TaxPayment;
use App\Traits\GeneratesReferenceNumbers;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    use SendsNotifications, GeneratesReferenceNumbers;

    // ============================================================
    // PAYMENTS
    // ============================================================

    // app/Http/Controllers/Web/Financial/FinanceController.php

    /**
     * Treasurer confirms a pending payment was received in cash.
     * Marks the payment completed, sets the OR, and moves the certificate
     * to Ready for Release.
     */
    public function confirmPayment(Request $request, $id)
    {
        try {
            $payment = Payment::with(['resident'])->find($id);

            if (!$payment) {
                return $this->respondNotFound('Payment not found');
            }

            if ($payment->status === 'completed') {
                return $this->respondError('Payment already confirmed', null, 422);
            }

            DB::beginTransaction();

            try {
                $payment->update([
                    'status'  => 'completed',
                    'paid_at' => now(),
                ]);

                // Move the linked certificate to Ready for Release
                if ($payment->payable_type === Certification::class && $payment->payable_id) {
                    $certification = Certification::find($payment->payable_id);
                    if ($certification) {
                        $certification->update([
                            'payment_status' => 'paid',
                            'status' => 'Ready for Release',
                        ]);
                    }
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            // Notify the resident
            try {
                $user = $this->getUserByResidentId($payment->resident_id);
                if ($user) {
                    $this->notifyUser(
                        $user->id,
                        '✅ Payment Confirmed',
                        'Your cash payment of ₱'
                            . number_format($payment->amount, 2)
                            . ' has been confirmed. Your certificate is ready for release.',
                        'payment',
                        'high',
                        '/resident/payments/' . $payment->id,
                        Auth::id(),
                        'payment',
                        $payment->id
                    );
                }
            } catch (\Exception $e) {
                Log::error('Payment confirm notify error: ' . $e->getMessage());
            }

            return $this->respondSuccess(
                $payment->load(['resident', 'processedBy']),
                'Payment confirmed successfully'
            );
        } catch (\Exception $e) {
            Log::error('Confirm payment error: ' . $e->getMessage());
            return $this->respondError('Failed to confirm payment', null, 500);
        }
    }

    /**
     * Treasurer rejects a payment (resident didn't show up, wrong amount, etc.).
     */
    public function rejectPayment(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:500',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $payment = Payment::find($id);
            if (!$payment) {
                return $this->respondNotFound('Payment not found');
            }

            if ($payment->status === 'completed') {
                return $this->respondError('Payment already confirmed', null, 422);
            }

            DB::beginTransaction();

            try {
                $payment->update(['status' => 'failed']);

                if ($payment->payable_type === Certification::class && $payment->payable_id) {
                    $certification = Certification::find($payment->payable_id);
                    if ($certification) {
                        $certification->update([
                            'payment_status' => 'failed',
                        ]);
                    }
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            // Notify the resident
            try {
                $user = $this->getUserByResidentId($payment->resident_id);
                if ($user) {
                    $this->notifyUser(
                        $user->id,
                        '❌ Payment Could Not Be Confirmed',
                        'Your payment request was not confirmed. Reason: '
                            . $request->reason
                            . '. Please contact the Barangay Treasurer.',
                        'payment',
                        'high',
                        '/resident/payments/' . $payment->id,
                        Auth::id(),
                        'payment',
                        $payment->id
                    );
                }
            } catch (\Exception $e) {
                Log::error('Payment reject notify error: ' . $e->getMessage());
            }

            return $this->respondSuccess($payment, 'Payment rejected');
        } catch (\Exception $e) {
            Log::error('Reject payment error: ' . $e->getMessage());
            return $this->respondError('Failed to reject payment', null, 500);
        }
    }

    public function indexPayments(Request $request)
    {
        try {
            $query = Payment::with(['resident', 'processedBy']);

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('type') && $request->type !== 'all') {
                $query->where('payment_type', 'LIKE', "%{$request->type}%");
            }

            if ($request->has('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            Log::info('FinanceController@indexPayments', [
                'total' => Payment::count(),
                'filters' => $request->all(),
            ]);

            $payments = $query->latest()->get();

            return response()->json([
                'success' => true,
                'message' => 'Payments retrieved successfully',
                'data' => $payments,
                'total' => $payments->count(),
            ], 200);
        } catch (\Exception $e) {
            Log::error('FinanceController@indexPayments error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payments',
                'data' => [],
            ], 500);
        }
    }

    public function storePayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'amount' => 'required|numeric|min:0',
            'payment_type' => 'required|string|max:255',
            'payment_method' => 'required|in:Cash,GCash',
            'description' => 'nullable|string',
            'payable_id' => 'nullable|integer',
            'payable_type' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $payment = Payment::create([
            'resident_id' => $request->resident_id,
            'processed_by_user_id' => Auth::id(),
            'amount' => $request->amount,
            'payment_type' => $request->payment_type,
            'payment_method' => $request->payment_method,
            'description' => $request->description,
            'or_number' => $this->generateReference('OR', Payment::class, 'or_number', 'YYYYMMDD-####'),
            'status' => 'completed',
            'paid_at' => now(),
            'payable_id' => $request->payable_id,
            'payable_type' => $request->payable_type,
        ]);

        $this->notifyPaymentRecorded($payment);

        return $this->respondSuccess(
            $payment->load(['resident', 'processedBy']),
            'Payment recorded successfully',
            201
        );
    }

    public function showPayment($id)
    {
        $payment = Payment::with(['resident', 'processedBy', 'payable'])->find($id);

        if (!$payment) {
            return $this->respondNotFound('Payment not found');
        }

        return $this->respondSuccess($payment);
    }

    public function paymentReceipt($id)
    {
        $payment = Payment::with(['resident', 'processedBy'])->find($id);

        if (!$payment) {
            return $this->respondNotFound('Payment not found');
        }

        return $this->respondSuccess([
            'or_number' => $payment->or_number,
            'resident_name' => $payment->resident ? $payment->resident->full_name : 'N/A',
            'amount' => $payment->amount,
            'payment_type' => $payment->payment_type,
            'payment_method' => $payment->payment_method,
            'date' => $payment->paid_at ? $payment->paid_at->format('Y-m-d') : $payment->created_at->format('Y-m-d'),
            'time' => $payment->paid_at ? $payment->paid_at->format('h:i A') : $payment->created_at->format('h:i A'),
            'processed_by' => $payment->processedBy ? $payment->processedBy->email : 'N/A',
        ]);
    }

    // ============================================================
    // TAX PAYMENTS
    // ============================================================

    public function indexTax(Request $request)
    {
        $query = TaxPayment::with(['resident', 'processedBy']);

        if ($request->has('type')) {
            $query->where('tax_type', $request->type);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('receipt_number', 'LIKE', "%{$search}%")
                    ->orWhere('taxpayer_name', 'LIKE', "%{$search}%");
            });
        }

        $taxPayments = $query->latest()->paginate(15);

        return $this->respondSuccess($taxPayments);
    }

    public function storeTax(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'nullable|exists:residents,id',
            'taxpayer_name' => 'required|string|max:255',
            'tax_type' => 'required|in:Cedula,Real Property Tax,Business Tax',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:Cash,GCash',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $taxPayment = TaxPayment::create([
            'resident_id' => $request->resident_id,
            'processed_by_user_id' => Auth::id(),
            'receipt_number' => $this->generateReference('TAX', TaxPayment::class, 'receipt_number'),
            'taxpayer_name' => $request->taxpayer_name,
            'tax_type' => $request->tax_type,
            'amount' => $request->amount,
            'payment_method' => $request->payment_method,
            'status' => 'paid',
            'paid_at' => now(),
            'remarks' => $request->remarks,
        ]);

        if ($request->resident_id) {
            $this->notifyTaxPayment($taxPayment);
        }

        return $this->respondSuccess(
            $taxPayment->load(['resident', 'processedBy']),
            'Tax payment recorded successfully',
            201
        );
    }

    public function showTax($id)
    {
        $taxPayment = TaxPayment::with(['resident', 'processedBy'])->find($id);

        if (!$taxPayment) {
            return $this->respondNotFound('Tax payment not found');
        }

        return $this->respondSuccess($taxPayment);
    }

    public function taxReceipt($id)
    {
        $taxPayment = TaxPayment::with(['resident', 'processedBy'])->find($id);

        if (!$taxPayment) {
            return $this->respondNotFound('Tax payment not found');
        }

        return $this->respondSuccess([
            'receipt_number' => $taxPayment->receipt_number,
            'taxpayer_name' => $taxPayment->taxpayer_name,
            'tax_type' => $taxPayment->tax_type,
            'amount' => $taxPayment->amount,
            'payment_method' => $taxPayment->payment_method,
            'date' => $taxPayment->paid_at ? $taxPayment->paid_at->format('Y-m-d') : $taxPayment->created_at->format('Y-m-d'),
            'time' => $taxPayment->paid_at ? $taxPayment->paid_at->format('h:i A') : $taxPayment->created_at->format('h:i A'),
            'processed_by' => $taxPayment->processedBy ? $taxPayment->processedBy->email : 'N/A',
        ]);
    }

    // ============================================================
    // TRANSACTIONS
    // ============================================================

    public function indexTransactions(Request $request)
    {
        $paymentsQuery = Payment::with(['resident', 'processedBy']);
        $taxQuery = TaxPayment::with(['resident', 'processedBy']);

        if ($request->has('status')) {
            $paymentsQuery->where('status', $request->status);
            $taxQuery->where('status', $request->status);
        }

        if ($request->has('type')) {
            if ($request->type === 'payment') {
                $taxQuery->where('id', 0);
            } elseif ($request->type === 'tax') {
                $paymentsQuery->where('id', 0);
            }
        }

        if ($request->has('search')) {
            $search = $request->search;
            $paymentsQuery->where(function ($q) use ($search) {
                $q->where('or_number', 'LIKE', "%{$search}%")
                    ->orWhereHas('resident', function ($rq) use ($search) {
                        $rq->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%");
                    });
            });
            $taxQuery->where(function ($q) use ($search) {
                $q->where('receipt_number', 'LIKE', "%{$search}%")
                    ->orWhere('taxpayer_name', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('date_from')) {
            $paymentsQuery->whereDate('created_at', '>=', $request->date_from);
            $taxQuery->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $paymentsQuery->whereDate('created_at', '<=', $request->date_to);
            $taxQuery->whereDate('created_at', '<=', $request->date_to);
        }

        $payments = $paymentsQuery->get()->map(function ($item) {
            return $this->formatPayment($item);
        });

        $taxes = $taxQuery->get()->map(function ($item) {
            return $this->formatTaxPayment($item);
        });

        $transactions = $payments->concat($taxes)
            ->sortByDesc('created_at')
            ->values();

        return $this->respondSuccess([
            'data' => $transactions,
            'meta' => [
                'total' => $transactions->count(),
                'total_amount' => $transactions->sum('amount'),
                'payment_count' => $payments->count(),
                'tax_count' => $taxes->count(),
            ]
        ]);
    }

    public function showTransaction($id)
    {
        $payment = Payment::with(['resident', 'processedBy'])->find($id);

        if ($payment) {
            return $this->respondSuccess($this->formatPayment($payment, true));
        }

        $tax = TaxPayment::with(['resident', 'processedBy'])->find($id);

        if ($tax) {
            return $this->respondSuccess($this->formatTaxPayment($tax, true));
        }

        return $this->respondNotFound('Transaction not found');
    }

    public function transactionSummary(Request $request)
    {
        $dateFrom = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo = $request->date_to ?? now()->endOfMonth()->toDateString();

        $totalPayments = Payment::whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->where('status', 'completed')
            ->sum('amount');

        $totalTax = TaxPayment::whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->where('status', 'paid')
            ->sum('amount');

        return $this->respondSuccess([
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'total_payments' => $totalPayments,
            'total_tax' => $totalTax,
            'total_revenue' => $totalPayments + $totalTax,
            'payment_count' => Payment::whereDate('created_at', '>=', $dateFrom)
                ->whereDate('created_at', '<=', $dateTo)
                ->count(),
            'tax_count' => TaxPayment::whereDate('created_at', '>=', $dateFrom)
                ->whereDate('created_at', '<=', $dateTo)
                ->count(),
        ]);
    }

    // ============================================================
    // PENALTIES
    // ============================================================

    public function indexPenalties(Request $request)
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

    public function storePenalty(Request $request)
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
            'reference_number' => $this->generateReference('PNL', Penalty::class),
            'reason' => $request->reason,
            'description' => $request->description,
            'amount' => $request->amount,
            'status' => 'pending',
            'issued_at' => now(),
            'remarks' => $request->remarks,
        ]);

        $this->notifyPenaltyIssued($penalty);

        return $this->respondSuccess(
            $penalty->load(['resident', 'issuedBy']),
            'Penalty issued successfully',
            201
        );
    }

    public function showPenalty($id)
    {
        $penalty = Penalty::with(['resident', 'issuedBy'])->find($id);

        if (!$penalty) {
            return $this->respondNotFound('Penalty not found');
        }

        return $this->respondSuccess($penalty);
    }

    public function updatePenalty(Request $request, $id)
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

        if ($previousStatus !== $request->status) {
            $this->notifyPenaltyStatusChanged($penalty, $previousStatus);
        }

        return $this->respondSuccess($penalty, 'Penalty updated successfully');
    }

    public function destroyPenalty($id)
    {
        $penalty = Penalty::find($id);

        if (!$penalty) {
            return $this->respondNotFound('Penalty not found');
        }

        $penalty->delete();

        return $this->respondSuccess(null, 'Penalty deleted successfully');
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================

    private function formatPayment($payment, $detailed = false)
    {
        $data = [
            'id' => $payment->id,
            'reference' => $payment->or_number,
            'type' => 'Payment',
            'category' => $payment->payment_type,
            'amount' => $payment->amount,
            'status' => $payment->status,
            'date' => $payment->paid_at ? $payment->paid_at->format('Y-m-d') : $payment->created_at->format('Y-m-d'),
            'time' => $payment->paid_at ? $payment->paid_at->format('h:i A') : $payment->created_at->format('h:i A'),
            'resident' => $payment->resident ? $payment->resident->full_name : 'N/A',
            'method' => $payment->payment_method,
            'processed_by' => $payment->processedBy ? $payment->processedBy->email : 'N/A',
            'created_at' => $payment->created_at,
        ];

        if ($detailed) {
            $data['details'] = $payment;
        }

        return $data;
    }

    private function formatTaxPayment($tax, $detailed = false)
    {
        $data = [
            'id' => $tax->id,
            'reference' => $tax->receipt_number,
            'type' => 'Tax Payment',
            'category' => $tax->tax_type,
            'amount' => $tax->amount,
            'status' => $tax->status,
            'date' => $tax->paid_at ? $tax->paid_at->format('Y-m-d') : $tax->created_at->format('Y-m-d'),
            'time' => $tax->paid_at ? $tax->paid_at->format('h:i A') : $tax->created_at->format('h:i A'),
            'resident' => $tax->taxpayer_name,
            'method' => $tax->payment_method,
            'processed_by' => $tax->processedBy ? $tax->processedBy->email : 'N/A',
            'created_at' => $tax->created_at,
        ];

        if ($detailed) {
            $data['details'] = $tax;
        }

        return $data;
    }

    private function notifyPaymentRecorded(Payment $payment): void
    {
        try {
            $user = $this->getUserByResidentId($payment->resident_id);
            if (!$user) return;

            $formattedAmount = '₱' . number_format($payment->amount, 2);
            $message = "Your payment of {$formattedAmount} for {$payment->payment_type} has been recorded. OR#: {$payment->or_number}.";

            $this->notifyUser(
                $user->id,
                '✅ Payment Received',
                $message,
                'payment',
                'normal',
                '/resident/payments/' . $payment->id,
                Auth::id(),
                'payment',
                $payment->id
            );
        } catch (\Exception $e) {
            Log::error('Payment notify error: ' . $e->getMessage());
        }
    }

    private function notifyTaxPayment(TaxPayment $taxPayment): void
    {
        try {
            $user = $this->getUserByResidentId($taxPayment->resident_id);
            if (!$user) return;

            $formattedAmount = '₱' . number_format($taxPayment->amount, 2);

            $this->notifyUser(
                $user->id,
                '🧾 Tax Payment Recorded',
                "Your {$taxPayment->tax_type} payment of {$formattedAmount} has been recorded. Receipt#: {$taxPayment->receipt_number}.",
                'payment',
                'normal',
                null,
                Auth::id(),
                'tax_payment',
                $taxPayment->id
            );
        } catch (\Exception $e) {
            Log::error('Tax notify error: ' . $e->getMessage());
        }
    }

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
}
