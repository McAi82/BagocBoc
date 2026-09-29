<?php

namespace App\Http\Controllers\Web\Financial;

use App\Http\Controllers\Controller;
use App\Models\TaxPayment;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class TaxController extends Controller
{
    use SendsNotifications;

    /**
     * List all tax payments
     */
    public function index(Request $request)
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

    /**
     * Record tax payment
     * ✅ Notifies resident (if linked) their tax payment is recorded
     */
    public function store(Request $request)
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
            'receipt_number' => $this->generateReceiptNumber(),
            'taxpayer_name' => $request->taxpayer_name,
            'tax_type' => $request->tax_type,
            'amount' => $request->amount,
            'payment_method' => $request->payment_method,
            'status' => 'paid',
            'paid_at' => now(),
            'remarks' => $request->remarks,
        ]);

        // ✅ Notify resident if linked
        if ($request->resident_id) {
            $this->notifyTaxPayment($taxPayment);
        }

        return $this->respondSuccess(
            $taxPayment->load(['resident', 'processedBy']),
            'Tax payment recorded successfully',
            201
        );
    }

    /**
     * Show tax payment
     */
    public function show($id)
    {
        $taxPayment = TaxPayment::with(['resident', 'processedBy'])->find($id);

        if (!$taxPayment) {
            return $this->respondNotFound('Tax payment not found');
        }

        return $this->respondSuccess($taxPayment);
    }

    /**
     * Generate receipt
     */
    public function receipt($id)
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

    // ============================================
    // HELPERS
    // ============================================

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

    private function generateReceiptNumber()
    {
        $year = date('Y');
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $receiptNumber = "TAX-{$year}-{$random}";

        while (TaxPayment::where('receipt_number', $receiptNumber)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $receiptNumber = "TAX-{$year}-{$random}";
        }

        return $receiptNumber;
    }
}
