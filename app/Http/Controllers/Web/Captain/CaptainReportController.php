<?php
// app/Http/Controllers/Web/Captain/CaptainReportController.php

namespace App\Http\Controllers\Web\Captain;

use App\Http\Controllers\Controller;
use App\Models\FinancialReport;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class CaptainReportController extends Controller
{
    use SendsNotifications;


    public function sendToCaptain(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'report_type' => 'required|string|in:certificate,clearance,resident_registry,collection,annual,tax,payment',
            'title'       => 'required|string|max:255',
            'content'     => 'required|string',
            'metadata'    => 'nullable|array',
            'period'      => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $period = $request->period ?? date('F Y');

            $report = FinancialReport::create([
                'created_by_user_id' => Auth::id(),
                'title'              => $request->title,
                'report_type'        => $request->report_type,
                'period'             => $period,
                'total_amount'       => $request->metadata['total_amount']
                    ?? $request->metadata['total_fee']
                    ?? 0,
                'notes'              => $request->content,
                'status'             => 'pending',
                'submitted_at'       => now(),
                'report_data'        => [
                    'source'    => $request->report_type,
                    'metadata'  => $request->metadata,
                    'reference' => $request->metadata['reference_number'] ?? null,
                    'sent_at'   => now()->toISOString(),
                ],
            ]);

            $this->notifyCaptain($report);

            DB::commit();

            Log::info("Report sent to Captain", [
                'report_id'   => $report->id,
                'type'        => $request->report_type,
                'reference'   => $request->metadata['reference_number'] ?? null,
                'user_id'     => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Report sent to Captain successfully!',
                'data'    => [
                    'report_id'        => $report->id,
                    'reference_number' => $request->metadata['reference_number'] ?? null,
                    'status'           => 'pending',
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Send to Captain error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send report: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all reports for Captain
     */
    public function getReports(Request $request)
    {
        $query = FinancialReport::with(['createdBy', 'createdBy.resident', 'createdBy.roles'])
            ->whereIn('report_type', ['certificate', 'clearance', 'resident_registry', 'collection', 'annual', 'tax', 'payment']);

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('type') && $request->type !== 'all') {
            $query->where('report_type', $request->type);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('notes', 'LIKE', "%{$search}%")
                    ->orWhereHas('createdBy', function ($sq) use ($search) {
                        $sq->where('email', 'LIKE', "%{$search}%");
                    });
            });
        }

        $reports = $query->latest()->paginate(20);

        return response()->json([
            'success' => true,
            'message' => 'Reports retrieved successfully',
            'data' => $reports
        ]);
    }

    /**
     * Get report statistics
     */
    public function getStats()
    {
        $stats = [
            'total' => FinancialReport::whereIn('report_type', ['certificate', 'clearance', 'resident_registry', 'collection', 'annual', 'tax', 'payment'])->count(),
            'pending' => FinancialReport::whereIn('report_type', ['certificate', 'clearance', 'resident_registry', 'collection', 'annual', 'tax', 'payment'])
                ->where('status', 'pending')->count(),
            'approved' => FinancialReport::whereIn('report_type', ['certificate', 'clearance', 'resident_registry', 'collection', 'annual', 'tax', 'payment'])
                ->where('status', 'approved')->count(),
            'rejected' => FinancialReport::whereIn('report_type', ['certificate', 'clearance', 'resident_registry', 'collection', 'annual', 'tax', 'payment'])
                ->where('status', 'rejected')->count(),
            'by_type' => FinancialReport::select('report_type', DB::raw('count(*) as total'))
                ->whereIn('report_type', ['certificate', 'clearance', 'resident_registry', 'collection', 'annual', 'tax', 'payment'])
                ->groupBy('report_type')
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get pending reports count
     */
    public function pendingCount()
    {
        $count = FinancialReport::whereIn('report_type', ['certificate', 'clearance', 'resident_registry', 'collection', 'annual', 'tax', 'payment'])
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'success' => true,
            'data' => ['count' => $count]
        ]);
    }

    /**
     * Approve a report (Captain)
     */
    public function approve($id)
    {
        $report = FinancialReport::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found'
            ], 404);
        }

        if ($report->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending reports can be approved'
            ], 422);
        }

        $report->update([
            'status' => 'approved',
            'approved_by_user_id' => Auth::id(),
            'approved_at' => now(),
        ]);

        $this->notifySubmitter($report, 'approved');

        return response()->json([
            'success' => true,
            'message' => 'Report approved successfully',
            'data' => $report->load('createdBy')
        ]);
    }

    /**
     * Reject a report (Captain)
     */
    public function reject(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $report = FinancialReport::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found'
            ], 404);
        }

        if ($report->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending reports can be rejected'
            ], 422);
        }

        $report->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'approved_by_user_id' => Auth::id(),
        ]);

        $this->notifySubmitter($report, 'rejected', $request->rejection_reason);

        return response()->json([
            'success' => true,
            'message' => 'Report rejected successfully',
            'data' => $report->load('createdBy')
        ]);
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private function notifyCaptain($report)
    {
        $typeLabels = [
            'certificate' => 'Certificate Report',
            'clearance' => 'Clearance Report',
            'resident_registry' => 'Resident Registry',
            'collection' => 'Collection Report',
            'annual' => 'Annual Summary',
            'tax' => 'Tax Collection',
            'payment' => 'Payment Summary',
        ];

        $typeLabel = $typeLabels[$report->report_type] ?? $report->report_type;

        $this->notifyRole(
            'Barangay Captain',
            "New {$typeLabel} Submitted",
            "A new {$typeLabel} '{$report->title}' has been submitted for your review.",
            'report',
            'high',
            '/reports/financial/' . $report->id,
            Auth::id(),
            'financial_report',
            $report->id
        );
    }

    private function notifySubmitter($report, $status, $reason = null)
    {
        $typeLabels = [
            'certificate' => 'Certificate Report',
            'clearance' => 'Clearance Report',
            'resident_registry' => 'Resident Registry',
            'collection' => 'Collection Report',
            'annual' => 'Annual Summary',
            'tax' => 'Tax Collection',
            'payment' => 'Payment Summary',
        ];

        $typeLabel = $typeLabels[$report->report_type] ?? $report->report_type;

        $title = $status === 'approved'
            ? "{$typeLabel} Approved"
            : "{$typeLabel} Rejected";

        $message = $status === 'approved'
            ? "Your {$typeLabel} '{$report->title}' has been approved by the Captain."
            : "Your {$typeLabel} '{$report->title}' has been rejected. Reason: {$reason}";

        $this->notifyUser(
            $report->created_by_user_id,
            $title,
            $message,
            'report',
            'high',
            '/reports/financial/' . $report->id,
            Auth::id(),
            'financial_report',
            $report->id
        );
    }
}
