<?php

namespace App\Http\Controllers\Web\Financial;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Resident;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    use SendsNotifications;

    /**
     * List all payments
     */
    public function index(Request $request)
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

            // ✅ Log for debugging
            Log::info('PaymentController@index', [
                'total' => Payment::count(),
                'filters' => $request->all(),
            ]);

            $payments = $query->latest()->get();

            // ✅ Return consistent response format
            return response()->json([
                'success' => true,
                'message' => 'Payments retrieved successfully',
                'data' => $payments,
                'total' => $payments->count(),
            ], 200);
        } catch (\Exception $e) {
            Log::error('PaymentController@index error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payments',
                'data' => [],
            ], 500);
        }
    }

    /**
     * Record payment
     * ✅ Notifies resident their payment is recorded
     */
    public function store(Request $request)
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
            'or_number' => $this->generateORNumber(),
            'status' => 'completed',
            'paid_at' => now(),
            'payable_id' => $request->payable_id,
            'payable_type' => $request->payable_type,
        ]);

        // ✅ Notify resident their payment has been recorded
        $this->notifyPaymentRecorded($payment);

        return $this->respondSuccess(
            $payment->load(['resident', 'processedBy']),
            'Payment recorded successfully',
            201
        );
    }

    /**
     * Show payment
     */
    public function show($id)
    {
        $payment = Payment::with(['resident', 'processedBy', 'payable'])->find($id);

        if (!$payment) {
            return $this->respondNotFound('Payment not found');
        }

        return $this->respondSuccess($payment);
    }

    /**
     * Generate receipt
     */
    public function receipt($id)
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

    // ============================================
    // HELPERS
    // ============================================

    /**
     * Notify resident about a recorded payment
     */
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

    private function generateORNumber()
    {
        $year = date('Y');
        $month = date('m');
        $day = date('d');
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $orNumber = "OR-{$year}{$month}{$day}-{$random}";

        while (Payment::where('or_number', $orNumber)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $orNumber = "OR-{$year}{$month}{$day}-{$random}";
        }

        return $orNumber;
    }
}
