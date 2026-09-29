<?php

namespace App\Http\Controllers\Web\Print;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Certification;
use App\Models\Clearance;
use App\Models\TaxPayment;
use App\Models\FrontDeskClaimSlip;
use Illuminate\Http\Request;

class PrintController extends Controller
{
    /**
     * Print/Download payment receipt
     */
    public function receipt($id)
    {
        $payment = Payment::with(['resident', 'processedBy'])->find($id);

        if (!$payment) {
            return $this->respondNotFound('Payment not found');
        }

        return $this->respondSuccess([
            'type' => 'receipt',
            'or_number' => $payment->or_number,
            'resident_name' => $payment->resident ? $payment->resident->full_name : 'N/A',
            'resident_address' => $payment->resident ? $payment->resident->place_of_birth : 'N/A',
            'amount' => $payment->amount,
            'payment_type' => $payment->payment_type,
            'payment_method' => $payment->payment_method,
            'date' => $payment->paid_at ? $payment->paid_at->format('F d, Y') : $payment->created_at->format('F d, Y'),
            'time' => $payment->paid_at ? $payment->paid_at->format('h:i A') : $payment->created_at->format('h:i A'),
            'processed_by' => $payment->processedBy ? $payment->processedBy->email : 'N/A',
            'status' => $payment->status,
        ]);
    }

    /**
     * Print/Download certificate
     */
    public function certificate($id)
    {
        $certification = Certification::with(['resident', 'certificationType', 'processedBy'])->find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        return $this->respondSuccess([
            'type' => 'certificate',
            'reference_number' => $certification->reference_number,
            'resident_name' => $certification->resident ? $certification->resident->full_name : 'N/A',
            'resident_address' => $certification->resident ? $certification->resident->place_of_birth : 'N/A',
            'certificate_type' => $certification->certificationType ? $certification->certificationType->name : 'N/A',
            'purpose' => $certification->purpose,
            'issued_at' => $certification->issued_at ? $certification->issued_at->format('F d, Y') : 'N/A',
            'expiry_date' => $certification->expiry_date ? $certification->expiry_date->format('F d, Y') : 'N/A',
            'status' => $certification->status,
            'processed_by' => $certification->processedBy ? $certification->processedBy->email : 'N/A',
        ]);
    }

    /**
     * Print/Download tax receipt
     */
    public function taxReceipt($id)
    {
        $taxPayment = TaxPayment::with(['resident', 'processedBy'])->find($id);

        if (!$taxPayment) {
            return $this->respondNotFound('Tax payment not found');
        }

        return $this->respondSuccess([
            'type' => 'tax_receipt',
            'receipt_number' => $taxPayment->receipt_number,
            'taxpayer_name' => $taxPayment->taxpayer_name,
            'tax_type' => $taxPayment->tax_type,
            'amount' => $taxPayment->amount,
            'payment_method' => $taxPayment->payment_method,
            'date' => $taxPayment->paid_at ? $taxPayment->paid_at->format('F d, Y') : $taxPayment->created_at->format('F d, Y'),
            'time' => $taxPayment->paid_at ? $taxPayment->paid_at->format('h:i A') : $taxPayment->created_at->format('h:i A'),
            'processed_by' => $taxPayment->processedBy ? $taxPayment->processedBy->email : 'N/A',
            'status' => $taxPayment->status,
        ]);
    }

    /**
     * Print/Download clearance
     */
    public function clearance($id)
    {
        $clearance = Clearance::with(['resident', 'processedBy'])->find($id);

        if (!$clearance) {
            return $this->respondNotFound('Clearance not found');
        }

        return $this->respondSuccess([
            'type' => 'clearance',
            'reference_number' => $clearance->reference_number,
            'resident_name' => $clearance->resident ? $clearance->resident->full_name : 'N/A',
            'resident_address' => $clearance->resident ? $clearance->resident->place_of_birth : 'N/A',
            'purpose' => $clearance->purpose,
            'amount' => $clearance->amount,
            'issued_at' => $clearance->issued_at ? $clearance->issued_at->format('F d, Y') : 'N/A',
            'valid_until' => $clearance->valid_until ? $clearance->valid_until->format('F d, Y') : 'N/A',
            'status' => $clearance->status,
            'processed_by' => $clearance->processedBy ? $clearance->processedBy->email : 'N/A',
        ]);
    }

    /**
     * Print/Download claim slip
     */
    public function claimSlip($id)
    {
        $claimSlip = FrontDeskClaimSlip::with(['resident', 'request', 'issuedBy'])->find($id);

        if (!$claimSlip) {
            return $this->respondNotFound('Claim slip not found');
        }

        return $this->respondSuccess([
            'type' => 'claim_slip',
            'reference_number' => $claimSlip->reference_number,
            'resident_name' => $claimSlip->resident ? $claimSlip->resident->full_name : 'N/A',
            'document_type' => $claimSlip->document_type,
            'status' => $claimSlip->status,
            'issued_at' => $claimSlip->issued_at ? $claimSlip->issued_at->format('F d, Y') : 'N/A',
            'issued_by' => $claimSlip->issuedBy ? $claimSlip->issuedBy->email : 'N/A',
        ]);
    }
}