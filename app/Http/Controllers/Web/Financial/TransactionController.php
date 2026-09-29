<?php

namespace App\Http\Controllers\Web\Financial;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\TaxPayment;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    /**
     * Get all transactions (Payments + Tax Payments)
     */
    public function index(Request $request)
    {
        $paymentsQuery = Payment::with(['resident', 'processedBy']);
        $taxQuery = TaxPayment::with(['resident', 'processedBy']);

        // Apply filters
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

        // Date range filter
        if ($request->has('date_from')) {
            $paymentsQuery->whereDate('created_at', '>=', $request->date_from);
            $taxQuery->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $paymentsQuery->whereDate('created_at', '<=', $request->date_to);
            $taxQuery->whereDate('created_at', '<=', $request->date_to);
        }

        // Get results
        $payments = $paymentsQuery->get()->map(function ($item) {
            return $this->formatPayment($item);
        });

        $taxes = $taxQuery->get()->map(function ($item) {
            return $this->formatTaxPayment($item);
        });

        // Combine and sort
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

    /**
     * Get transaction details
     */
    public function show($id)
    {
        // Try to find in payments first
        $payment = Payment::with(['resident', 'processedBy'])->find($id);

        if ($payment) {
            return $this->respondSuccess($this->formatPayment($payment, true));
        }

        // Try tax payments
        $tax = TaxPayment::with(['resident', 'processedBy'])->find($id);

        if ($tax) {
            return $this->respondSuccess($this->formatTaxPayment($tax, true));
        }

        return $this->respondNotFound('Transaction not found');
    }

    /**
     * Get transaction summary
     */
    public function summary(Request $request)
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

    /**
     * Format payment for response
     */
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

    /**
     * Format tax payment for response
     */
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
}