<?php

namespace App\Http\Controllers\Mobile\Health;

use App\Http\Controllers\Controller;
use App\Models\OptPlusAssessment;
use App\Models\Resident;
use App\Models\RecordActivityLog;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OptPlusController extends Controller
{
    use SendsNotifications;

    public function index(Request $request)
    {
        $assessments = OptPlusAssessment::with('resident')
            ->latest()->get();

        return $this->respondSuccess($assessments);
    }

    public function getByEncoder($encoderId)
    {
        $assessmentIds = RecordActivityLog::where('encoded_by', $encoderId)
            ->where('record_type', OptPlusAssessment::class)
            ->where('action', 'Added Opt Plus Records')
            ->pluck('record_id');

        $assessments = OptPlusAssessment::with('resident')
            ->whereIn('id', $assessmentIds)->get();

        return $this->respondSuccess($assessments);
    }

    /**
     * Store new OPT Plus assessment
     * ✅ Zone-scoped notification to BHWs
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assessment_date' => 'required|date',
            'resident_id' => 'required|exists:residents,id',
            'weight_kg' => 'required|numeric',
            'height_cm' => 'required|numeric',
            'remarks' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $assessment = OptPlusAssessment::create($request->all());

        $assessment->load('resident');
        $residentName = $assessment->resident ? $assessment->resident->full_name : 'Unknown';

        RecordActivityLog::create([
            'encoded_by' => Auth::id(),
            'record_id' => $assessment->id,
            'record_type' => get_class($assessment),
            'action' => 'Added Opt Plus Records',
            'data_status' => 'Saved',
            'details' => "Added OPT Plus assessment for {$residentName}"
        ]);

        // ✅ ZONE-SCOPED NOTIFICATION
        try {
            $zoneId = $this->resolveZoneForResident($assessment->resident_id);

            if ($zoneId) {
                // Only BHWs in the resident's zone get notified
                $this->notifyBHWsInZone(
                    $zoneId,
                    '📊 New OPT Plus Assessment',
                    "A new OPT Plus assessment was recorded for {$residentName}.",
                    'health',
                    'normal',
                    null,
                    Auth::id(),
                    'opt_plus_assessment',
                    $assessment->id
                );
            } else {
                Log::info('OPT Plus assessment — no zone found, skipping BHW notification', [
                    'assessment_id' => $assessment->id,
                    'resident_id' => $assessment->resident_id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('OPT Plus notify BHWs error: ' . $e->getMessage());
        }

        return $this->respondSuccess($assessment, 'OPT Plus assessment created successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $assessment = OptPlusAssessment::find($id);

        if (!$assessment) {
            return $this->respondNotFound('Assessment not found');
        }

        $validator = Validator::make($request->all(), [
            'assessment_date' => 'sometimes|date',
            'resident_id' => 'sometimes|exists:residents,id',
            'weight_kg' => 'sometimes|numeric',
            'height_cm' => 'sometimes|numeric',
            'remarks' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $assessment->update($request->all());
        $assessment->load('resident');
        $residentName = $assessment->resident ? $assessment->resident->full_name : 'Unknown';

        RecordActivityLog::create([
            'encoded_by' => Auth::id(),
            'record_id' => $assessment->id,
            'record_type' => get_class($assessment),
            'action' => 'Updated Opt Plus Records',
            'data_status' => 'Updated',
            'details' => "Updated OPT Plus assessment for {$residentName}"
        ]);

        return $this->respondSuccess($assessment, 'OPT Plus assessment updated successfully');
    }

    public function destroy($id)
    {
        $assessment = OptPlusAssessment::find($id);

        if (!$assessment) {
            return $this->respondNotFound('Assessment not found');
        }

        $assessmentId = $assessment->id;
        $recordType = get_class($assessment);
        $residentName = $assessment->resident ? $assessment->resident->full_name : 'Unknown';

        $assessment->delete();

        RecordActivityLog::create([
            'encoded_by' => Auth::id(),
            'record_id' => $assessmentId,
            'record_type' => $recordType,
            'action' => 'Deleted Opt Plus Records',
            'data_status' => 'Deleted',
            'details' => "Deleted OPT Plus assessment for {$residentName}"
        ]);

        return $this->respondSuccess(null, 'OPT Plus assessment deleted successfully');
    }

    /**
     * Resolve the zone ID for a resident via their active household
     */
    private function resolveZoneForResident(int $residentId): ?int
    {
        $zoneId = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('resident_households.resident_id', $residentId)
            ->where('resident_households.status', 'active')
            ->value('household_addresses.zone');

        return $zoneId ? (int) $zoneId : null;
    }
}
