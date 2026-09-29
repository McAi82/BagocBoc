<?php

namespace App\Http\Controllers\Web\Records;

use App\Http\Controllers\Controller;
use App\Models\RecordActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class RecordActivityLogController extends Controller
{
    /**
     * Get all activity logs
     */
    public function index(Request $request)
    {
        $query = RecordActivityLog::with(['encoder', 'record']);

        if ($request->has('type')) {
            $query->where('record_type', $request->type);
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        $logs = $query->latest()->paginate(50);

        return $this->respondSuccess($logs);
    }

    /**
     * Store activity log
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'encoded_by' => 'required|exists:users,id',
            'record_id' => 'required|integer',
            'record_type' => 'required|string',
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

    /**
     * Get logs by encoder
     */
    public function getByEncoder($userId)
    {
        $logs = RecordActivityLog::with(['encoder', 'record'])
            ->where('encoded_by', $userId)
            ->latest()
            ->get();

        return $this->respondSuccess($logs);
    }

    /**
     * Get logs by record
     */
    public function getByRecord($recordId, $recordType)
    {
        $logs = RecordActivityLog::with(['encoder'])
            ->where('record_id', $recordId)
            ->where('record_type', $recordType)
            ->latest()
            ->get();

        return $this->respondSuccess($logs);
    }

    /**
     * Show single log
     */
    public function show($id)
    {
        $log = RecordActivityLog::with(['encoder', 'record'])->find($id);

        if (!$log) {
            return $this->respondNotFound('Log not found');
        }

        return $this->respondSuccess($log);
    }

    /**
     * Delete log
     */
    public function destroy($id)
    {
        $log = RecordActivityLog::find($id);

        if (!$log) {
            return $this->respondNotFound('Log not found');
        }

        $log->delete();

        return $this->respondSuccess(null, 'Log deleted successfully');
    }
}