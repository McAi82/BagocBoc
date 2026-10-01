<?php

namespace App\Http\Controllers\Web\Health;

use App\Http\Controllers\Controller;
use App\Models\PatientRecord;
use App\Models\PregnancyRecord;
use App\Models\ChildRecord;
use App\Models\LactatingRecord;
use App\Models\SeniorRecord;
use App\Models\NcdRecord;
use App\Models\CheckupRecord;
use App\Models\PregnancyCheckup;
use App\Models\ChildCheckup;
use App\Models\LactatingCheckup;
use App\Models\SeniorCheckup;
use App\Models\NcdCheckup;
use App\Models\Resident;
use App\Models\User;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class PatientController extends Controller
{
    use SendsNotifications;

    // ============================================
    // PATH A: Create New Patient Record
    // ============================================

    public function searchResident(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'search' => 'required|string|min:2',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $search = $request->search;

        $residents = Resident::where(function ($q) use ($search) {
            $q->where('first_name', 'LIKE', "%{$search}%")
                ->orWhere('last_name', 'LIKE', "%{$search}%")
                ->orWhere('phone_number', 'LIKE', "%{$search}%");
        })
            ->limit(10)
            ->get();

        $results = $residents->map(function ($resident) {
            $existingRecord = PatientRecord::where('resident_id', $resident->id)->first();
            return [
                'resident' => $resident,
                'has_record' => $existingRecord !== null,
                'patient_record_id' => $existingRecord?->id,
                'patient_type' => $existingRecord?->patient_type,
            ];
        });

        return $this->respondSuccess([
            'results' => $results,
            'total' => $results->count(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'resident_id'  => ['required', 'integer', 'exists:residents,id'],
            'patient_type' => [
                'required',
                Rule::in(['pregnant', 'child', 'lactating', 'senior', 'ncd']),
            ],

            // Vitals
            'vital_signs'                  => ['nullable', 'array'],
            'vital_signs.blood_pressure'   => ['nullable', 'string', 'max:20'],
            'vital_signs.heart_rate'       => ['nullable', 'numeric', 'min:0', 'max:300'],
            'vital_signs.temperature'      => ['nullable', 'numeric', 'min:30', 'max:45'],
            'vital_signs.respiratory_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'vital_signs.weight'           => ['nullable', 'numeric', 'min:0', 'max:500'],
            'vital_signs.height'           => ['nullable', 'numeric', 'min:0', 'max:300'],

            // Pregnancy
            'last_menstrual_period'  => ['nullable', 'date'],
            'expected_delivery_date' => ['nullable', 'date'],
            'gestational_age'        => ['nullable', 'integer', 'min:0', 'max:45'],
            'gravida'                => ['nullable', 'integer', 'min:0', 'max:20'],
            'para'                   => ['nullable', 'integer', 'min:0', 'max:20'],
            'obstetric_history'      => ['nullable', 'string'],
            'risk_level'             => ['nullable', Rule::in(['low', 'medium', 'high'])],
            'immunization_status'    => ['nullable', 'string', 'max:255'],
            'prenatal_logs'          => ['nullable', 'string'],
            'allergies'              => ['nullable', 'string'],
            'medical_history'        => ['nullable', 'string'],
            'current_medications'    => ['nullable', 'string'],

            // Child
            'birth_weight'             => ['nullable', 'numeric', 'min:0', 'max:20'],
            'birth_height'             => ['nullable', 'numeric', 'min:0', 'max:100'],
            'birth_head_circumference' => ['nullable', 'numeric', 'min:0', 'max:60'],
            'gestational_age_at_birth' => ['nullable', 'integer', 'min:0', 'max:45'],
            'birth_type'               => ['nullable', 'string', 'max:255'],
            'birth_complications'      => ['nullable', 'string'],
            'immunization_history'     => ['nullable', 'string'],
            'chronic_conditions'       => ['nullable', 'string'],
            'current_weight'           => ['nullable', 'numeric', 'min:0', 'max:200'],
            'current_height'           => ['nullable', 'numeric', 'min:0', 'max:250'],
            'current_muac'             => ['nullable', 'numeric', 'min:0', 'max:40'],

            // Lactating
            'breastfeeding_status' => ['nullable', 'string', 'max:50'],
            'infant_age'           => ['nullable', 'integer', 'min:0', 'max:60'],
            'feeding_method'       => ['nullable', 'string', 'max:50'],
            'latching_assessment'  => ['nullable', 'string'],
            'nutritional_status'   => ['nullable', 'string', 'max:255'],
            'family_planning_method' => ['nullable', 'string', 'max:255'],
            'maternal_health_status' => ['nullable', 'string'],
            'infant_weight'        => ['nullable', 'numeric', 'min:0', 'max:30'],
            'infant_health_status' => ['nullable', 'string'],

            // Senior
            'falls_risk_score'     => ['nullable', 'integer', 'min:0', 'max:10'],
            'cognitive_assessment' => ['nullable', 'string'],
            'memory_status'        => ['nullable', 'string', 'max:255'],
            'medication_list'      => ['nullable', 'string'],
            'activity_level'       => ['nullable', 'string', 'max:255'],
            'support_system'       => ['nullable', 'string'],
            'emergency_contact'    => ['nullable', 'string', 'max:255'],

            // NCD
            'ncd_classification' => ['nullable', 'string', 'max:255'],
            'diagnosis_date'     => ['nullable', 'date'],
            'lab_results'        => ['nullable', 'array'],
            'medications'        => ['nullable', 'string'],
            'complications'      => ['nullable', 'string'],
            'lifestyle_factors'  => ['nullable', 'string'],
            'treatment_history'  => ['nullable', 'string'],
            'current_status'     => ['nullable', 'string', 'max:255'],
        ]);

        // Guard: one patient record per resident
        $existing = PatientRecord::where('resident_id', $validated['resident_id'])->first();
        if ($existing) {
            return response()->json([
                'status'  => 'error',
                'message' => 'This resident already has a patient record.',
                'data'    => $existing,
            ], 409);
        }

        $userId = $request->user()?->id;
        if (!$userId) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Unauthenticated. Please log in again.',
            ], 401);
        }

        DB::beginTransaction();

        try {
            $patient = PatientRecord::create([
                'resident_id'        => $validated['resident_id'],
                'patient_type'       => $validated['patient_type'],
                'vital_signs'        => $validated['vital_signs'] ?? null,
                'status'             => 'active',
                'created_by_user_id' => $userId,
            ]);

            switch ($validated['patient_type']) {
                /* ---------- PREGNANT ---------- */
                case 'pregnant':
                    PregnancyRecord::create([
                        'patient_record_id'      => $patient->id,
                        'resident_id'            => $validated['resident_id'],
                        'last_menstrual_period'  => $validated['last_menstrual_period'] ?? null,
                        'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                        'gestational_age'        => $validated['gestational_age'] ?? null,
                        'gravida'                => $validated['gravida'] ?? null,
                        'para'                   => $validated['para'] ?? null,
                        'obstetric_history'      => $validated['obstetric_history'] ?? null,
                        'risk_level'             => $validated['risk_level'] ?? 'low',
                        'immunization_status'    => $validated['immunization_status'] ?? null,
                        'prenatal_logs'          => $validated['prenatal_logs'] ?? null,
                        'allergies'              => $validated['allergies'] ?? null,
                        'medical_history'        => $validated['medical_history'] ?? null,
                        'current_medications'    => $validated['current_medications'] ?? null,
                    ]);
                    break;

                /* ---------- CHILD ---------- */
                case 'child':
                    ChildRecord::create([
                        'patient_record_id'          => $patient->id,
                        'resident_id'                => $validated['resident_id'],
                        'birth_weight'               => $validated['birth_weight'] ?? null,
                        'birth_height'               => $validated['birth_height'] ?? null,
                        'birth_head_circumference'   => $validated['birth_head_circumference'] ?? null,
                        'gestational_age_at_birth'   => $validated['gestational_age_at_birth'] ?? null,
                        'birth_type'                 => $validated['birth_type'] ?? null,
                        'birth_complications'        => $validated['birth_complications'] ?? null,
                        'immunization_history'       => $validated['immunization_history'] ?? null,
                        'allergies'                  => $validated['allergies'] ?? null,
                        'chronic_conditions'         => $validated['chronic_conditions'] ?? null,
                        'current_weight'             => $validated['current_weight'] ?? null,
                        'current_height'             => $validated['current_height'] ?? null,
                        'current_muac'               => $validated['current_muac'] ?? null,
                        'current_nutritional_status' => 'normal',
                    ]);
                    break;

                /* ---------- LACTATING ---------- */
                case 'lactating':
                    LactatingRecord::create([
                        'patient_record_id'      => $patient->id,
                        'resident_id'            => $validated['resident_id'],
                        'breastfeeding_status'   => $validated['breastfeeding_status'] ?? 'exclusive',
                        'infant_age'             => $validated['infant_age'] ?? null,
                        'feeding_method'         => $validated['feeding_method'] ?? null,
                        'latching_assessment'    => $validated['latching_assessment'] ?? null,
                        'nutritional_status'     => $validated['nutritional_status'] ?? null,
                        'family_planning_method' => $validated['family_planning_method'] ?? null,
                        'maternal_health_status' => $validated['maternal_health_status'] ?? null,
                        'infant_weight'          => $validated['infant_weight'] ?? null,
                        'infant_health_status'   => $validated['infant_health_status'] ?? null,
                    ]);
                    break;

                /* ---------- SENIOR ---------- */
                case 'senior':
                    SeniorRecord::create([
                        'patient_record_id'    => $patient->id,
                        'resident_id'          => $validated['resident_id'],
                        'falls_risk_score'     => $validated['falls_risk_score'] ?? null,
                        'cognitive_assessment' => $validated['cognitive_assessment'] ?? null,
                        'memory_status'        => $validated['memory_status'] ?? null,
                        'chronic_conditions'   => $validated['chronic_conditions'] ?? null,
                        'medication_list'      => $validated['medication_list'] ?? null,
                        'allergies'            => $validated['allergies'] ?? null,
                        'activity_level'       => $validated['activity_level'] ?? null,
                        'support_system'       => $validated['support_system'] ?? null,
                        'emergency_contact'    => $validated['emergency_contact'] ?? null,
                    ]);
                    break;

                /* ---------- NCD ---------- */
                case 'ncd':
                    NcdRecord::create([
                        'patient_record_id'  => $patient->id,
                        'resident_id'        => $validated['resident_id'],
                        'ncd_classification' => $validated['ncd_classification'] ?? null,
                        'diagnosis_date'     => $validated['diagnosis_date'] ?? null,
                        'lab_results'        => $validated['lab_results'] ?? null,
                        'medications'        => $validated['medications'] ?? null,
                        'complications'      => $validated['complications'] ?? null,
                        'lifestyle_factors'  => $validated['lifestyle_factors'] ?? null,
                        'allergies'          => $validated['allergies'] ?? null,
                        'treatment_history'  => $validated['treatment_history'] ?? null,
                        'current_status'     => $validated['current_status'] ?? 'monitoring',
                    ]);
                    break;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Failed to create patient record.', [
                'resident_id'  => $validated['resident_id'] ?? null,
                'patient_type' => $validated['patient_type'] ?? null,
                'user_id'      => $userId,
                'message'      => $e->getMessage(),
            ]);

            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to create patient record.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        $patient->load([
            'resident',
            'pregnancyRecord',
            'childRecord',
            'lactatingRecord',
            'seniorRecord',
            'ncdRecord',
            'checkups',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Patient record created successfully.',
            'data'    => $patient,
        ], 201);
    }

    // ============================================
    // 1. PREGNANT
    // ============================================

    public function getPregnantRecords(Request $request)
    {
        $query = PatientRecord::with(['resident', 'pregnancyRecord'])
            ->where('patient_type', 'pregnant')
            ->where('status', 'active');

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('resident', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        $records = $query->latest()->paginate(20);

        $records->getCollection()->transform(function ($record) {
            return $this->enhancePregnancyRecord($record);
        });

        return $this->respondSuccess($records);
    }

    public function getPregnancyDetails($id)
    {
        $record = PatientRecord::with(['resident', 'pregnancyRecord', 'checkups'])
            ->where('patient_type', 'pregnant')
            ->find($id);

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Pregnancy record not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $record,
        ]);
    }

    /**
     * Get child details
     * GET /api/web/health/records/children/{id}
     */
    public function getChildDetails($id)
    {
        $record = PatientRecord::with(['resident', 'childRecord', 'checkups'])
            ->where('patient_type', 'child')
            ->find($id);

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Child record not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $record,
        ]);
    }

    /**
     * Get lactating details
     * GET /api/web/health/records/lactating/{id}
     */
    public function getLactatingDetails($id)
    {
        $record = PatientRecord::with(['resident', 'lactatingRecord', 'checkups'])
            ->where('patient_type', 'lactating')
            ->find($id);

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lactating record not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $record,
        ]);
    }

    /**
     * Get senior details
     * GET /api/web/health/records/senior/{id}
     */
    public function getSeniorDetails($id)
    {
        $record = PatientRecord::with(['resident', 'seniorRecord', 'checkups'])
            ->where('patient_type', 'senior')
            ->find($id);

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Senior record not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $record,
        ]);
    }

    /**
     * Get NCD details
     * GET /api/web/health/records/other/{id}
     */
    public function getOtherDetails($id)
    {
        $record = PatientRecord::with(['resident', 'ncdRecord', 'checkups'])
            ->where('patient_type', 'ncd')
            ->find($id);

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'NCD record not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $record,
        ]);
    }

    /* ============================================
   PREGNANCY CHECKUP — extended
   ============================================ */
    public function storePregnancyCheckup(Request $request, $id)
    {
        $patientRecord = PatientRecord::with(['resident'])
            ->where('patient_type', 'pregnant')->find($id);

        if (!$patientRecord) {
            return $this->respondNotFound('Pregnancy record not found');
        }

        $validator = Validator::make($request->all(), [
            'checkup_date' => 'required|date',

            'maternal_vitals' => 'nullable|array',
            'maternal_vitals.blood_pressure' => 'nullable|string',
            'maternal_vitals.heart_rate' => 'nullable|integer',
            'maternal_vitals.temperature' => 'nullable|numeric',
            'maternal_vitals.weight' => 'nullable|numeric',

            'fetal_assessment' => 'nullable|string',
            'fetal_heart_rate' => 'nullable|integer',
            'fundal_height' => 'nullable|numeric',

            'interventions' => 'nullable|string',
            'micronutrients' => 'nullable|string',
            'iron_supplement' => 'nullable|boolean',
            'folic_acid' => 'nullable|boolean',

            'clinical_assessment' => 'nullable|string',
            'risk_level' => 'nullable|in:low,medium,high',
            'recommendations' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        try {
            $result = DB::transaction(function () use ($request, $patientRecord) {
                $checkup = CheckupRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $patientRecord->resident_id,
                    'performed_by_user_id' => Auth::id(),
                    'checkup_type' => 'pregnancy',
                    'checkup_date' => $request->checkup_date ?? now(),
                    'vital_signs' => $request->maternal_vitals,
                    'assessment' => $request->clinical_assessment,
                    'diagnosis' => $request->fetal_assessment,
                    'treatment' => $request->interventions,
                    'recommendations' => $request->recommendations,
                    'follow_up_date' => $request->follow_up_date,
                    'status' => 'completed',
                    'notes' => $request->notes,
                ]);

                PregnancyCheckup::create([
                    'checkup_record_id'  => $checkup->id,
                    'maternal_vitals'    => $request->maternal_vitals,
                    'fetal_assessment'   => $request->fetal_assessment,
                    'fetal_heart_rate'   => $request->fetal_heart_rate,
                    'fundal_height'      => $request->fundal_height,
                    'interventions'      => $request->interventions,
                    'micronutrients'     => $request->micronutrients,
                    'iron_supplement'    => $request->iron_supplement ?? false,
                    'folic_acid'         => $request->folic_acid ?? false,
                    'clinical_assessment' => $request->clinical_assessment,
                ]);

                if ($request->has('risk_level')) {
                    $patientRecord->pregnancyRecord()->update([
                        'risk_level' => $request->risk_level,
                    ]);
                }

                $this->notifyBHWsAboutCheckup($patientRecord, $checkup, 'pregnancy check-up');

                return $checkup;
            });

            return $this->respondSuccess(
                $result->load(['performedBy', 'pregnancyCheckup']),
                'Pregnancy check-up recorded successfully',
                201
            );
        } catch (\Exception $e) {
            Log::error('Failed to save pregnancy checkup: ' . $e->getMessage());
            return $this->respondError('Failed to save checkup: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // 2. CHILDREN
    // ============================================

    public function getChildrenRecords(Request $request)
    {
        $query = PatientRecord::with(['resident', 'childRecord'])
            ->where('patient_type', 'child')->where('status', 'active');

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('resident', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        $records = $query->latest()->paginate(20);

        $records->getCollection()->transform(function ($record) {
            return $this->enhanceChildRecord($record);
        });

        return $this->respondSuccess($records);
    }

    public function storeChildCheckup(Request $request, $id)
    {
        $patientRecord = PatientRecord::with(['resident'])
            ->where('patient_type', 'child')->find($id);

        if (!$patientRecord) {
            return $this->respondNotFound('Child record not found');
        }

        $validator = Validator::make($request->all(), [
            'checkup_date' => 'required|date',
            'weight' => 'required|numeric|min:0',
            'height' => 'required|numeric|min:0',
            'muac' => 'nullable|numeric|min:0',
            'head_circumference' => 'nullable|numeric|min:0',
            'vaccines_given' => 'nullable|array',
            'vaccines_given.*.name' => 'required|string',
            'vaccines_given.*.date' => 'required|date',
            'vaccines_given.*.batch' => 'nullable|string',
            'developmental_assessment' => 'nullable|string',
            'developmental_milestones' => 'nullable|array',
            'interventions' => 'nullable|string',
            'nutritional_counseling' => 'nullable|string',
            'clinical_assessment' => 'nullable|string',
            'nutritional_status' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'developmental_milestones' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        try {
            $result = DB::transaction(function () use ($request, $patientRecord) {
                $checkup = CheckupRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $patientRecord->resident_id,
                    'performed_by_user_id' => Auth::id(),
                    'checkup_type' => 'child',
                    'checkup_date' => $request->checkup_date ?? now(),
                    'assessment' => $request->clinical_assessment,
                    'diagnosis' => $request->developmental_assessment,
                    'treatment' => $request->interventions,
                    'recommendations' => $request->recommendations,
                    'follow_up_date' => $request->follow_up_date,
                    'status' => 'completed',
                    'notes' => $request->notes,
                ]);

                ChildCheckup::create([
                    'checkup_record_id' => $checkup->id,
                    'weight' => $request->weight,
                    'height' => $request->height,
                    'muac' => $request->muac,
                    'head_circumference' => $request->head_circumference,
                    'vaccines_given' => $request->vaccines_given,
                    'developmental_assessment' => $request->developmental_assessment,
                    'developmental_milestones' => $request->developmental_milestones,
                    'nutritional_status' => $request->nutritional_status,
                    'nutritional_counseling' => $request->nutritional_counseling,
                    'interventions' => $request->interventions,
                    'developmental_milestones' => $request->developmental_milestones,
                ]);

                $patientRecord->childRecord()->update([
                    'weight' => $request->weight,
                    'height' => $request->height,
                    'muac' => $request->muac,
                ]);

                $this->notifyBHWsAboutCheckup($patientRecord, $checkup, 'child check-up/vaccination');

                return $checkup;
            });

            return $this->respondSuccess(
                $result->load(['performedBy', 'childCheckup']),
                'Child check-up recorded successfully',
                201
            );
        } catch (\Exception $e) {
            Log::error('Failed to save child checkup: ' . $e->getMessage());
            return $this->respondError('Failed to save checkup: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // 3. LACTATING
    // ============================================

    public function getLactatingRecords(Request $request)
    {
        $query = PatientRecord::with(['resident', 'lactatingRecord'])
            ->where('patient_type', 'lactating')->where('status', 'active');

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('resident', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        $records = $query->latest()->paginate(20);
        return $this->respondSuccess($records);
    }

    public function storeLactatingCheckup(Request $request, $id)
    {
        $patientRecord = PatientRecord::with(['resident'])
            ->where('patient_type', 'lactating')->find($id);

        if (!$patientRecord) {
            return $this->respondNotFound('Lactating record not found');
        }

        $validator = Validator::make($request->all(), [
            'checkup_date' => 'required|date',
            'feeding_method' => 'nullable|string',
            'latching_assessment' => 'nullable|string',
            'engorgement_status' => 'nullable|string',
            'nutritional_counseling' => 'nullable|string',
            'infant_weight' => 'nullable|numeric|min:0',
            'infant_health_status' => 'nullable|string',
            'family_planning_counseling' => 'nullable|string',
            'family_planning_method' => 'nullable|string',
            'clinical_assessment' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'engorgement_status' => 'nullable|string',
            'family_planning_counseling' => 'nullable|string',
            'family_planning_method' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        try {
            $result = DB::transaction(function () use ($request, $patientRecord) {
                $checkup = CheckupRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $patientRecord->resident_id,
                    'performed_by_user_id' => Auth::id(),
                    'checkup_type' => 'lactating',
                    'checkup_date' => $request->checkup_date ?? now(),
                    'assessment' => $request->clinical_assessment,
                    'treatment' => $request->nutritional_counseling,
                    'recommendations' => $request->recommendations,
                    'follow_up_date' => $request->follow_up_date,
                    'status' => 'completed',
                    'notes' => $request->notes,
                ]);

                LactatingCheckup::create([
                    'checkup_record_id' => $checkup->id,
                    'feeding_method' => $request->feeding_method,
                    'latching_assessment' => $request->latching_assessment,
                    'engorgement_status' => $request->engorgement_status,
                    'nutritional_counseling' => $request->nutritional_counseling,
                    'infant_weight' => $request->infant_weight,
                    'infant_health_status' => $request->infant_health_status,
                    'family_planning_counseling' => $request->family_planning_counseling,
                    'family_planning_method' => $request->family_planning_method,
                    'engorgement_status' => $request->engorgement_status,
                    'family_planning_counseling' => $request->family_planning_counseling,
                    'family_planning_method' => $request->family_planning_method,
                ]);

                if ($request->has('infant_weight')) {
                    $patientRecord->lactatingRecord()->update([
                        'infant_weight' => $request->infant_weight,
                        'infant_health_status' => $request->infant_health_status,
                    ]);
                }

                $this->notifyBHWsAboutCheckup($patientRecord, $checkup, 'lactation check-up/counseling');

                return $checkup;
            });

            return $this->respondSuccess(
                $result->load(['performedBy', 'lactatingCheckup']),
                'Lactation check-up recorded successfully',
                201
            );
        } catch (\Exception $e) {
            Log::error('Failed to save lactation checkup: ' . $e->getMessage());
            return $this->respondError('Failed to save checkup: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // 4. SENIOR
    // ============================================

    public function getSeniorRecords(Request $request)
    {
        $query = PatientRecord::with(['resident', 'seniorRecord'])
            ->where('patient_type', 'senior')->where('status', 'active');

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('resident', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        $records = $query->latest()->paginate(20);
        return $this->respondSuccess($records);
    }

    public function storeSeniorCheckup(Request $request, $id)
    {
        $patientRecord = PatientRecord::with(['resident'])
            ->where('patient_type', 'senior')->find($id);

        if (!$patientRecord) {
            return $this->respondNotFound('Senior record not found');
        }

        $validator = Validator::make($request->all(), [
            'checkup_date' => 'required|date',
            'vitals' => 'nullable|array',
            'vitals.blood_pressure' => 'nullable|string',
            'vitals.heart_rate' => 'nullable|integer',
            'vitals.temperature' => 'nullable|numeric',
            'blood_sugar' => 'nullable|numeric',
            'falls_reassessment' => 'nullable|integer',
            'cognitive_check' => 'nullable|string',
            'medication_adherence' => 'nullable|string',
            'medications_refilled' => 'nullable|array',
            'clinical_assessment' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        try {
            $result = DB::transaction(function () use ($request, $patientRecord) {
                $checkup = CheckupRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $patientRecord->resident_id,
                    'performed_by_user_id' => Auth::id(),
                    'checkup_type' => 'senior',
                    'checkup_date' => $request->checkup_date ?? now(),
                    'vital_signs' => $request->vitals,
                    'assessment' => $request->clinical_assessment,
                    'recommendations' => $request->recommendations,
                    'follow_up_date' => $request->follow_up_date,
                    'status' => 'completed',
                    'notes' => $request->notes,
                ]);

                SeniorCheckup::create([
                    'checkup_record_id' => $checkup->id,
                    'vitals' => $request->vitals,
                    'blood_sugar' => $request->blood_sugar,
                    'falls_reassessment' => $request->falls_reassessment,
                    'cognitive_check' => $request->cognitive_check,
                    'medication_adherence' => $request->medication_adherence,
                    'medications_refilled' => $request->medications_refilled,
                ]);

                if ($request->has('falls_reassessment')) {
                    $patientRecord->seniorRecord()->update([
                        'falls_risk_score' => $request->falls_reassessment,
                    ]);
                }

                $this->notifyBHWsAboutCheckup($patientRecord, $checkup, 'senior health review');

                return $checkup;
            });

            return $this->respondSuccess(
                $result->load(['performedBy', 'seniorCheckup']),
                'Senior health review recorded successfully',
                201
            );
        } catch (\Exception $e) {
            Log::error('Failed to save senior checkup: ' . $e->getMessage());
            return $this->respondError('Failed to save checkup: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // 5. NCD
    // ============================================

    public function getOtherRecords(Request $request)
    {
        $query = PatientRecord::with(['resident', 'ncdRecord'])
            ->where('patient_type', 'ncd')->where('status', 'active');

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('resident', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        $records = $query->latest()->paginate(20);
        return $this->respondSuccess($records);
    }

    public function storeOtherCheckup(Request $request, $id)
    {
        $patientRecord = PatientRecord::with(['resident'])
            ->where('patient_type', 'ncd')->find($id);

        if (!$patientRecord) {
            return $this->respondNotFound('NCD record not found');
        }

        $validator = Validator::make($request->all(), [
            'checkup_date' => 'required|date',
            'vitals' => 'nullable|array',
            'lab_results' => 'nullable|array',
            'medication_adherence' => 'nullable|string',
            'medications_refilled' => 'nullable|array',
            'lifestyle_counseling' => 'nullable|string',
            'dietary_counseling' => 'nullable|string',
            'exercise_recommendations' => 'nullable|string',
            'complication_monitoring' => 'nullable|string',
            'clinical_assessment' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'medications_refilled' => 'nullable|array',
            'dietary_counseling' => 'nullable|string',
            'exercise_recommendations' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        try {
            $result = DB::transaction(function () use ($request, $patientRecord) {
                $checkup = CheckupRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $patientRecord->resident_id,
                    'performed_by_user_id' => Auth::id(),
                    'checkup_type' => 'ncd',
                    'checkup_date' => $request->checkup_date ?? now(),
                    'vital_signs' => $request->vitals,
                    'assessment' => $request->clinical_assessment,
                    'treatment' => $request->lifestyle_counseling,
                    'recommendations' => $request->recommendations,
                    'follow_up_date' => $request->follow_up_date,
                    'status' => 'completed',
                    'notes' => $request->notes,
                ]);

                NcdCheckup::create([
                    'checkup_record_id' => $checkup->id,
                    'vitals' => $request->vitals,
                    'lab_results' => $request->lab_results,
                    'medication_adherence' => $request->medication_adherence,
                    'medications_refilled' => $request->medications_refilled,
                    'lifestyle_counseling' => $request->lifestyle_counseling,
                    'dietary_counseling' => $request->dietary_counseling,
                    'exercise_recommendations' => $request->exercise_recommendations,
                    'complication_monitoring' => $request->complication_monitoring,
                ]);

                $this->notifyBHWsAboutCheckup($patientRecord, $checkup, 'NCD monitoring');

                return $checkup;
            });

            return $this->respondSuccess(
                $result->load(['performedBy', 'ncdCheckup']),
                'NCD monitoring recorded successfully',
                201
            );
        } catch (\Exception $e) {
            Log::error('Failed to save NCD checkup: ' . $e->getMessage());
            return $this->respondError('Failed to save checkup: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // LEGACY
    // ============================================

    public function index(Request $request)
    {
        if ($request->has('patient_type')) {
            switch ($request->patient_type) {
                case 'pregnant':
                    return $this->getPregnantRecords($request);
                case 'child':
                    return $this->getChildrenRecords($request);
                case 'lactating':
                    return $this->getLactatingRecords($request);
                case 'senior':
                    return $this->getSeniorRecords($request);
                case 'ncd':
                    return $this->getOtherRecords($request);
            }
        }

        $records = PatientRecord::with(['resident', 'createdBy'])
            ->where('status', 'active')
            ->latest()->paginate(20);

        return $this->respondSuccess($records);
    }

    public function show($id)
    {
        $record = PatientRecord::with([
            'resident',
            'pregnancyRecord',
            'childRecord',
            'lactatingRecord',
            'seniorRecord',
            'ncdRecord',
            'checkups',
        ])->find($id);

        if (!$record) {
            return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $record]);
    }

    public function getAllCheckups(Request $request)
    {
        $query = CheckupRecord::with(['resident', 'performedBy', 'patientRecord']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('resident', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('checkup_type')) {
            $query->where('checkup_type', $request->checkup_type);
        }

        if ($request->has('date_from')) {
            $query->whereDate('checkup_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('checkup_date', '<=', $request->date_to);
        }

        $checkups = $query->orderBy('checkup_date', 'desc')->paginate(20);

        return $this->respondSuccess($checkups);
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private function createSpecificRecord($request, $patientRecord)
    {
        switch ($request->patient_type) {
            case 'pregnant':
                PregnancyRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $request->resident_id,
                    'last_menstrual_period' => $request->last_menstrual_period,
                    'expected_delivery_date' => $request->expected_delivery_date,
                    'gestational_age' => $request->gestational_age,
                    'gravida' => $request->gravida,
                    'para' => $request->para,
                    'obstetric_history' => $request->obstetric_history,
                    'risk_level' => $request->risk_level ?? 'low',
                ]);
                break;
            case 'child':
                ChildRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $request->resident_id,
                    'birth_weight' => $request->birth_weight,
                    'birth_height' => $request->birth_height,
                    'birth_head_circumference' => $request->birth_head_circumference,
                    'gestational_age_at_birth' => $request->gestational_age_at_birth,
                ]);
                break;
            case 'lactating':
                LactatingRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $request->resident_id,
                    'breastfeeding_status' => $request->breastfeeding_status,
                    'infant_age' => $request->infant_age,
                ]);
                break;
            case 'senior':
                SeniorRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $request->resident_id,
                    'falls_risk_score' => $request->falls_risk_score,
                    'cognitive_assessment' => $request->cognitive_assessment,
                ]);
                break;
            case 'ncd':
                NcdRecord::create([
                    'patient_record_id' => $patientRecord->id,
                    'resident_id' => $request->resident_id,
                    'ncd_classification' => $request->ncd_classification,
                    'diagnosis_date' => $request->diagnosis_date,
                ]);
                break;
        }
    }

    private function enhancePregnancyRecord($record)
    {
        $record->pregnancy_timeline = null;

        if ($record->pregnancyRecord) {
            $pregnancy = $record->pregnancyRecord;
            $lmp = $pregnancy->last_menstrual_period;
            $edd = $pregnancy->expected_delivery_date;

            if ($lmp) {
                $lmpDate = \Carbon\Carbon::parse($lmp);
                $record->pregnancy_timeline = [
                    'last_menstrual_period' => $lmp,
                    'expected_delivery_date' => $edd,
                    'gestational_age_weeks' => $lmpDate->diffInWeeks(now()),
                    'gestational_age_days' => $lmpDate->diffInDays(now()),
                    'trimester' => $this->calculateTrimester($lmpDate),
                    'days_until_delivery' => $edd ? now()->diffInDays($edd, false) : null,
                ];
            }
        }

        return $record;
    }

    private function calculateTrimester($lmpDate)
    {
        $weeks = $lmpDate->diffInWeeks(now());
        if ($weeks < 13) return 'First Trimester';
        if ($weeks < 27) return 'Second Trimester';
        return 'Third Trimester';
    }

    private function enhanceChildRecord($record)
    {
        if ($record->resident && $record->resident->birth_date) {
            $record->age = now()->diffInYears($record->resident->birth_date);
            $record->age_months = now()->diffInMonths($record->resident->birth_date);
        }

        if ($record->childRecord) {
            $child = $record->childRecord;
            $record->growth_metrics = [
                'weight' => $child->birth_weight,
                'height' => $child->birth_height,
                'head_circumference' => $child->birth_head_circumference,
                'gestational_age_at_birth' => $child->gestational_age_at_birth,
            ];
        }

        return $record;
    }

    /**
     * ✅ Notify BHWs about a new patient record
     */
    private function notifyBHWsAboutPatient($patientRecord, string $title, string $message): void
    {
        try {
            $resident = Resident::find($patientRecord->resident_id);
            $bhwIds = User::whereHas('roles', function ($q) {
                $q->where('name', 'Barangay Health Worker');
            })->pluck('id')->toArray();

            $zoneBhw = $this->getZoneBHWUser($resident);
            if ($zoneBhw && !in_array($zoneBhw->id, $bhwIds)) {
                $bhwIds[] = $zoneBhw->id;
            }

            if (empty($bhwIds)) return;

            $this->notify(
                $bhwIds,
                $title,
                $message,
                'health',
                'high',
                '/health/records/patient/' . $patientRecord->id,
                Auth::id(),
                'patient_record',
                $patientRecord->id
            );
        } catch (\Exception $e) {
            Log::error('Notify BHWs patient error: ' . $e->getMessage());
        }
    }

    /**
     * ✅ Notify BHWs about a checkup
     */
    private function notifyBHWsAboutCheckup($patientRecord, $checkup, string $type): void
    {
        try {
            $resident = Resident::find($patientRecord->resident_id);
            $typeLabels = [
                'pregnant' => 'Pregnancy',
                'child' => 'Child',
                'lactating' => 'Lactation',
                'senior' => 'Senior',
                'ncd' => 'NCD',
            ];

            $bhwIds = User::whereHas('roles', function ($q) {
                $q->where('name', 'Barangay Health Worker');
            })->pluck('id')->toArray();

            $zoneBhw = $this->getZoneBHWUser($resident);
            if ($zoneBhw && !in_array($zoneBhw->id, $bhwIds)) {
                $bhwIds[] = $zoneBhw->id;
            }

            if (empty($bhwIds)) return;

            $this->notify(
                $bhwIds,
                "New {$typeLabels[$patientRecord->patient_type]} Check-up",
                "A new {$type} has been recorded for {$resident->first_name} {$resident->last_name}.",
                'health',
                'high',
                '/health/records/checkup/' . $checkup->id,
                Auth::id(),
                'checkup',
                $checkup->id
            );
        } catch (\Exception $e) {
            Log::error('Notify BHWs checkup error: ' . $e->getMessage());
        }
    }

    private function getZoneBHWUser($resident)
    {
        try {
            if (!$resident) return null;

            $zoneId = DB::table('resident_households')
                ->join('households', 'resident_households.household_id', '=', 'households.id')
                ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
                ->where('resident_households.resident_id', $resident->id)
                ->where('resident_households.status', 'active')
                ->value('household_addresses.zone');

            if (!$zoneId) return null;

            return User::whereHas('roles', function ($q) {
                $q->where('name', 'Barangay Health Worker');
            })->whereHas('resident', function ($q) use ($zoneId) {
                $q->whereHas('households.address', function ($addr) use ($zoneId) {
                    $addr->where('zone', $zoneId);
                });
            })->first();
        } catch (\Exception $e) {
            Log::error('Error finding zone BHW: ' . $e->getMessage());
            return null;
        }
    }
}
