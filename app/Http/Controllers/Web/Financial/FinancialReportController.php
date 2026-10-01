<?php

namespace App\Http\Controllers\Web\Financial;

use App\Http\Controllers\Controller;
use App\Models\FinancialReport;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class FinancialReportController extends Controller
{
    use SendsNotifications;

    /**
     * List all financial reports
     */
    public function index(Request $request)
    {
        $query = FinancialReport::with(['createdBy', 'approvedBy']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('report_type', $request->type);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('period', 'LIKE', "%{$search}%");
            });
        }

        $reports = $query->latest()->paginate(15);

        return $this->respondSuccess($reports);
    }

    /**
     * Create financial report
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'report_type' => 'required|in:collection,budget,annual,certificate',
            'period' => 'required|string|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $report = FinancialReport::create([
            'title' => $request->title,
            'report_type' => $request->report_type,
            'period' => $request->period,
            'total_amount' => $this->calculateTotalAmount($request->report_type, $request->period),
            'notes' => $request->notes,
            'status' => 'draft',
            'created_by_user_id' => Auth::id(),
            'report_data' => $this->generateReportData($request->report_type, $request->period),
        ]);

        return $this->respondSuccess(
            $report->load('createdBy'),
            'Financial report created successfully',
            201
        );
    }

    /**
     * Show financial report
     */
    public function show($id)
    {
        $report = FinancialReport::with(['createdBy', 'approvedBy'])->find($id);

        if (!$report) {
            return $this->respondNotFound('Financial report not found');
        }

        return $this->respondSuccess($report);
    }


    public function submit(Request $request, $id)
    {
        $report = FinancialReport::find($id);

        if (!$report) {
            return $this->respondNotFound('Financial report not found');
        }

        if ($report->status !== 'draft') {
            return $this->respondError('Only draft reports can be submitted', null, 422);
        }

        $validator = Validator::make($request->all(), [
            'title'    => 'sometimes|string|max:255',
            'content'  => 'sometimes|string',
            'period'   => 'sometimes|string|max:100',
            'metadata' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $report->update([
            'title'        => $request->input('title', $report->title),
            'period'       => $request->input('period', $report->period),
            'notes'        => $request->input('content', $report->notes),
            'status'       => 'pending',
            'submitted_at' => now(),
            'report_data'  => array_merge(
                is_array($report->report_data) ? $report->report_data : [],
                $request->input('metadata', [])
            ),
        ]);

        // ✅ Notify Captain
        $this->notifyRole(
            'Barangay Captain',
            '📊 Financial Report Awaiting Approval',
            "A financial report '{$report->title}' ({$report->report_type}) for {$report->period} is awaiting your review.",
            'report',
            'high',
            '/reports/financial/' . $report->id,
            Auth::id(),
            'financial_report',
            $report->id
        );

        return $this->respondSuccess($report, 'Report submitted for approval');
    }

    /**
     * Approve report
     * ✅ Notifies submitter
     */
    public function approve($id)
    {
        $report = FinancialReport::find($id);

        if (!$report) {
            return $this->respondNotFound('Financial report not found');
        }

        if ($report->status !== 'pending') {
            return $this->respondError('Only pending reports can be approved', null, 422);
        }

        $report->update([
            'status' => 'approved',
            'approved_by_user_id' => Auth::id(),
            'approved_at' => now(),
        ]);

        // ✅ Notify the submitter that it's approved
        if ($report->created_by_user_id) {
            $this->notifyUser(
                $report->created_by_user_id,
                'Financial Report Approved',
                "Your financial report '{$report->title}' has been approved.",
                'report',
                'high',
                '/reports/financial/' . $report->id,
                Auth::id(),
                'financial_report',
                $report->id
            );
        }

        return $this->respondSuccess($report, 'Report approved successfully');
    }

    /**
     * Reject report
     * ✅ Notifies submitter with reason
     */
    public function reject(Request $request, $id)
    {
        $report = FinancialReport::find($id);

        if (!$report) {
            return $this->respondNotFound('Financial report not found');
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $report->update([
            'status' => 'rejected',
            'approved_by_user_id' => Auth::id(),
            'rejection_reason' => $request->rejection_reason,
        ]);

        // ✅ Notify the submitter that it was rejected with the reason
        if ($report->created_by_user_id) {
            $this->notifyUser(
                $report->created_by_user_id,
                'Financial Report Rejected',
                "Your financial report '{$report->title}' was rejected. Reason: {$request->rejection_reason}",
                'report',
                'high',
                '/reports/financial/' . $report->id,
                Auth::id(),
                'financial_report',
                $report->id
            );
        }

        return $this->respondSuccess($report, 'Report rejected');
    }

    /**
     * Get pending reports
     */
    public function pending()
    {
        $reports = FinancialReport::with(['createdBy'])
            ->where('status', 'pending')
            ->latest()
            ->get();

        return $this->respondSuccess($reports);
    }

    private function calculateTotalAmount($type, $period)
    {
        return rand(1000, 50000);
    }

    private function generateReportData($type, $period)
    {
        return [
            'generated_at' => now()->toDateTimeString(),
            'period' => $period,
            'type' => $type,
            'summary' => 'Report data generated',
        ];
    }
}
