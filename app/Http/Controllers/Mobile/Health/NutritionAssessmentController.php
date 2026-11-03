<?php
// app/Http/Controllers/Mobile/Health/NutritionAssessmentController.php

namespace App\Http\Controllers\Mobile\Health;

use App\Http\Controllers\Controller;
use App\Models\NutritionAssessment;
use App\Traits\ResolvesZones;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class NutritionAssessmentController extends Controller
{
    use SendsNotifications, ResolvesZones;

    public function index(Request $request)
    {
        $query = NutritionAssessment::with(['participant', 'participant.resident', 'encodedBy']);

        if ($request->has('participant_id')) {
            $query->where('participant_id', $request->participant_id);
        }

        $assessments = $query->latest()->paginate(20);
        return $this->respondSuccess($assessments);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'participant_id' => 'required|exists:program_participants,id',
            'assessment_date' => 'required|date',
            'weight' => 'required|numeric',
            'height' => 'required|numeric',
            'bmi' => 'nullable|numeric',
            'nutrition_status' => 'nullable|string',
            'weight_for_age_status' => 'nullable|string',
            'height_for_age_status' => 'nullable|string',
            'weight_for_height_status' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $assessment = NutritionAssessment::create([
            'participant_id' => $request->participant_id,
            'assessment_date' => $request->assessment_date,
            'weight' => $request->weight,
            'height' => $request->height,
            'bmi' => $request->bmi,
            'nutrition_status' => $request->nutrition_status,
            'weight_for_age_status' => $request->weight_for_age_status,
            'height_for_age_status' => $request->height_for_age_status,
            'weight_for_height_status' => $request->weight_for_height_status,
            'remarks' => $request->remarks,
            'encoded_by' => Auth::id(),
        ]);

        $assessment->load(['participant', 'participant.resident']);

        $participantName = $assessment->participant?->resident?->full_name ?? 'Unknown';
        $residentId = $assessment->participant?->resident_id;

        try {
            $zoneId = $residentId ? $this->resolveZoneForResident((int) $residentId) : null;

            if ($zoneId) {
                $isConcerning = in_array($request->nutrition_status, [
                    'underweight',
                    'severely_underweight',
                    'wasted',
                    'severely_wasted',
                ]);

                if ($isConcerning) {
                    $this->notifyBHWsInZone(
                        $zoneId,
                        '⚠️ Nutrition Alert',
                        "A nutrition assessment for {$participantName} shows {$request->nutrition_status}. Please follow up.",
                        'health',
                        'high',
                        null,
                        Auth::id(),
                        'nutrition_assessment',
                        $assessment->id
                    );
                } else {
                    $this->notifyBHWsInZone(
                        $zoneId,
                        '🥗 New Nutrition Assessment',
                        "A nutrition assessment was recorded for {$participantName}.",
                        'health',
                        'normal',
                        null,
                        Auth::id(),
                        'nutrition_assessment',
                        $assessment->id
                    );
                }
            } else {
                Log::info('Nutrition assessment — no zone found, skipping BHW notification', [
                    'assessment_id' => $assessment->id,
                    'resident_id' => $residentId,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Nutrition notify BHWs error: ' . $e->getMessage());
        }

        return $this->respondSuccess($assessment, 'Nutrition assessment created successfully', 201);
    }

    public function show($id)
    {
        $assessment = NutritionAssessment::with(['participant', 'participant.resident', 'encodedBy'])
            ->find($id);

        if (!$assessment) {
            return $this->respondNotFound('Nutrition assessment not found');
        }

        return $this->respondSuccess($assessment);
    }

    public function update(Request $request, $id)
    {
        $assessment = NutritionAssessment::find($id);

        if (!$assessment) {
            return $this->respondNotFound('Nutrition assessment not found');
        }

        $validator = Validator::make($request->all(), [
            'assessment_date' => 'sometimes|date',
            'weight' => 'sometimes|numeric',
            'height' => 'sometimes|numeric',
            'bmi' => 'nullable|numeric',
            'nutrition_status' => 'nullable|string',
            'weight_for_age_status' => 'nullable|string',
            'height_for_age_status' => 'nullable|string',
            'weight_for_height_status' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $assessment->update($request->all());

        return $this->respondSuccess(
            $assessment->load(['participant', 'participant.resident']),
            'Nutrition assessment updated successfully'
        );
    }

    public function destroy($id)
    {
        $assessment = NutritionAssessment::find($id);

        if (!$assessment) {
            return $this->respondNotFound('Nutrition assessment not found');
        }

        $assessment->delete();
        return $this->respondSuccess(null, 'Nutrition assessment deleted successfully');
    }
}
