<?php
// app/Http/Controllers/Web/Records/RecordsController.php

namespace App\Http\Controllers\Web\Records;

use App\Http\Controllers\Controller;
use App\Models\RecordActivityLog;
use App\Traits\SendsNotifications;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecordsController extends Controller
{
    use SendsNotifications;

    // ============================================================
    // ACTIVITY LOGS (was RecordActivityLogController)
    //
    // NOTE: `record` is a morphTo() and record_type is free text. Never use
    // with('record') directly: one row pointing at a missing class (e.g.
    // App\Models\SurveyResponse) crashes the whole request with a 500.
    // Load `encoder` with with(), then call RecordActivityLog::loadRecordsSafely().
    // ============================================================

    public function indexLogs(Request $request)
    {
        $query = RecordActivityLog::with('encoder');

        if ($request->has('type')) {
            $query->where('record_type', $request->type);
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        $logs = $query->latest()->paginate(50);

        RecordActivityLog::loadRecordsSafely($logs->getCollection());

        return $this->respondSuccess($logs);
    }

    public function storeLog(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'encoded_by' => 'required|exists:users,id',
            'record_id' => 'required|integer',
            // Reject types that point at a class that doesn't exist, so no new
            // "bad" rows are created. Remove this closure if you must keep
            // storing free-text types.
            'record_type' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    if (!RecordActivityLog::recordTypeExists($value)) {
                        $fail('The selected record type is not a known model.');
                    }
                },
            ],
            'action' => 'required|string',
            'data_status' => 'nullable|string',
            'details' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $log = RecordActivityLog::create($request->all());

        return $this->respondSuccess($log, 'Activity log created successfully', 201);
    }

    public function showLog($id)
    {
        $log = RecordActivityLog::with('encoder')->find($id);

        if (!$log) {
            return $this->respondNotFound('Log not found');
        }

        RecordActivityLog::loadRecordsSafely(new Collection([$log]));

        return $this->respondSuccess($log);
    }

    public function destroyLog($id)
    {
        $log = RecordActivityLog::find($id);

        if (!$log) {
            return $this->respondNotFound('Log not found');
        }

        $log->delete();

        return $this->respondSuccess(null, 'Log deleted successfully');
    }

    /**
     * Used by the mobile BHW dashboard (GET /activity-logs/encoder/{userId}).
     * The app does not use the `record` relation, so it is not loaded here.
     * That also keeps this endpoint fast and crash-proof.
     */
    public function logsByEncoder($userId)
    {
        $logs = RecordActivityLog::with('encoder')
            ->where('encoded_by', $userId)
            ->latest()
            ->get();

        return $this->respondSuccess($logs);
    }

    public function logsByRecord($recordId, $recordType)
    {
        $logs = RecordActivityLog::with('encoder')
            ->where('record_id', $recordId)
            ->where('record_type', $recordType)
            ->latest()
            ->get();

        return $this->respondSuccess($logs);
    }

    // ============================================================
    // APPROVAL WORKFLOW (was the old RecordsController)
    // ============================================================

    public function getPendingRecords(Request $request)
    {
        $query = RecordActivityLog::with('encoder')
            ->where(function ($q) {
                $q->where('data_status', 'Saved')
                    ->orWhere('data_status', 'Pending');
            })
            ->orderBy('created_at', 'asc');

        if ($request->has('type')) {
            $query->where('record_type', $request->type);
        }

        $records = $query->paginate(15);

        RecordActivityLog::loadRecordsSafely($records->getCollection());

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
