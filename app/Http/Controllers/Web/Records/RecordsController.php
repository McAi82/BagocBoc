<?php

namespace App\Http\Controllers\Web\Records;

use App\Http\Controllers\Controller;
use App\Models\RecordActivityLog;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecordsController extends Controller
{
    use SendsNotifications;

    /**
     * Get pending records for approval
     */
    public function getPendingRecords(Request $request)
    {
        $query = RecordActivityLog::with(['encoder', 'record'])
            ->where(function ($q) {
                $q->where('data_status', 'Saved')
                    ->orWhere('data_status', 'Pending');
            })
            ->orderBy('created_at', 'asc');

        if ($request->has('type')) {
            $query->where('record_type', $request->type);
        }

        $records = $query->paginate(15);

        return $this->respondSuccess($records);
    }

    public function stats()
    {
        $stats = [
            'total' => RecordActivityLog::count(),
            'pending' => RecordActivityLog::where('data_status', 'Pending')->count(),
            'approved' => RecordActivityLog::where('data_status', 'Approved')->count(),
            'rejected' => RecordActivityLog::where('data_status', 'Rejected')->count(),
            'by_type' => RecordActivityLog::select('record_type', DB::raw('count(*) as total'))
                ->groupBy('record_type')->get(),
            'by_action' => RecordActivityLog::select('action', DB::raw('count(*) as total'))
                ->groupBy('action')->get(),
        ];

        return $this->respondSuccess($stats);
    }

    /**
     * Approve a record
     * ✅ Notifies the encoder who submitted
     */
    public function approveRecord($id)
    {
        $record = RecordActivityLog::find($id);

        if (!$record) {
            return $this->respondNotFound('Record not found');
        }

        $record->update([
            'data_status' => 'Approved',
            'details' => ($record->details ?? '') . ' | Approved by ' . Auth::user()->email,
        ]);

        // ✅ Notify the encoder who submitted the record
        if ($record->encoded_by) {
            $this->notifyUser(
                $record->encoded_by,
                '✅ Record Approved',
                "Your submission '{$record->action}' has been approved.",
                'record',
                'normal',
                null,
                Auth::id(),
                'activity_log',
                $record->id
            );
        }

        return $this->respondSuccess($record, 'Record approved successfully');
    }

    /**
     * Reject a record
     * ✅ Notifies the encoder with the reason
     */
    public function rejectRecord(Request $request, $id)
    {
        $record = RecordActivityLog::find($id);

        if (!$record) {
            return $this->respondNotFound('Record not found');
        }

        $reason = $request->reason ?? 'No reason provided';

        $record->update([
            'data_status' => 'Rejected',
            'details' => ($record->details ?? '') . ' | Rejected by ' . Auth::user()->email . ' | Reason: ' . $reason,
        ]);

        // ✅ Notify the encoder who submitted the record
        if ($record->encoded_by) {
            $this->notifyUser(
                $record->encoded_by,
                '❌ Record Rejected',
                "Your submission '{$record->action}' was rejected. Reason: {$reason}",
                'record',
                'high',
                null,
                Auth::id(),
                'activity_log',
                $record->id
            );
        }

        return $this->respondSuccess($record, 'Record rejected');
    }
}
