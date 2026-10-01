<?php
// app/Http/Controllers/Web/Health/HealthReportsController.php

namespace App\Http\Controllers\Web\Health;

use App\Http\Controllers\Controller;
use App\Models\PatientRecord;
use App\Models\CheckupRecord;
use App\Models\PregnancyRecord;
use App\Models\ChildRecord;
use App\Models\LactatingRecord;
use App\Models\SeniorRecord;
use App\Models\NcdRecord;
use App\Models\Resident;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class HealthReportsController extends Controller
{
    /**
     * Route entry point.
     * GET /web/health/reports?scope=midwife|ndp&preset=month|week|today|custom&from=&to=
     */
    public function index(Request $request)
    {
        try {
            $scope = $request->input('scope', 'midwife');
            if (!in_array($scope, ['midwife', 'ndp'])) {
                return $this->respondError('Invalid scope. Use "midwife" or "ndp".', null, 422);
            }

            $range = $this->resolveDateRange($request);

            $payload = $scope === 'midwife'
                ? $this->buildMidwifeReport($range)
                : $this->buildNdpReport($range);

            return $this->respondSuccess([
                'scope' => $scope,
                'range' => $range,
                ...$payload,
            ]);
        } catch (\Exception $e) {
            Log::error('Health reports error: ' . $e->getMessage());
            return $this->respondError('Failed to build reports: ' . $e->getMessage(), null, 500);
        }
    }

    /* ============================================================
       MIDWIFE REPORT
       ============================================================ */

    private function buildMidwifeReport(array $range): array
    {
        $stats    = $this->midwifeStats($range);
        $pregnant = $this->midwifePregnantList($range);
        $lactating = $this->midwifeLactatingList($range);
        $infants  = $this->midwifeInfantList($range);
        $monthly  = $this->midwifeMonthlyTrend($range);
        $risk     = $this->midwifeRiskFlags();

        return [
            'stats'        => $stats,
            'pregnant'     => $pregnant,
            'lactating'    => $lactating,
            'infants'      => $infants,
            'monthly_trend' => $monthly,
            'risk_flags'   => $risk,
        ];
    }

    private function midwifeStats(array $range): array
    {
        $patientQuery = PatientRecord::query();
        if ($range['from']) $patientQuery->whereDate('created_at', '>=', $range['from']);
        if ($range['to'])   $patientQuery->whereDate('created_at', '<=', $range['to']);

        $pregnant  = (clone $patientQuery)->where('patient_type', 'pregnant')->count();
        $lactating = (clone $patientQuery)->where('patient_type', 'lactating')->count();

        // Infants: children whose resident is under 1 year old
        $infantIds = Resident::where('birth_date', '>=', Carbon::today()->subYear())
            ->pluck('id');
        $infants = (clone $patientQuery)
            ->where('patient_type', 'child')
            ->whereIn('resident_id', $infantIds)
            ->count();

        $todayCheckups = CheckupRecord::whereDate('checkup_date', Carbon::today())->count();

        $highRiskPregnancy = PregnancyRecord::where('risk_level', 'high')->count();
        $prenatalCheckups = CheckupRecord::where('checkup_type', 'pregnancy')
            ->when($range['from'], fn($q) => $q->whereDate('checkup_date', '>=', $range['from']))
            ->when($range['to'],   fn($q) => $q->whereDate('checkup_date', '<=', $range['to']))
            ->count();
        $postpartumCheckups = CheckupRecord::where('checkup_type', 'lactating')
            ->when($range['from'], fn($q) => $q->whereDate('checkup_date', '>=', $range['from']))
            ->when($range['to'],   fn($q) => $q->whereDate('checkup_date', '<=', $range['to']))
            ->count();

        return [
            'pregnant'            => $pregnant,
            'lactating'           => $lactating,
            'infants'             => $infants,
            'today_checkups'      => $todayCheckups,
            'high_risk_pregnancy' => $highRiskPregnancy,
            'prenatal_checkups'   => $prenatalCheckups,
            'postpartum_checkups' => $postpartumCheckups,
        ];
    }

    private function midwifePregnantList(array $range): array
    {
        return PregnancyRecord::with('resident')
            ->whereHas('patientRecord', function ($q) use ($range) {
                if ($range['from']) $q->whereDate('created_at', '>=', $range['from']);
                if ($range['to'])   $q->whereDate('created_at', '<=', $range['to']);
            })
            ->latest()
            ->get()
            ->map(function ($p) {
                $age = null;
                if ($p->resident && $p->resident->birth_date) {
                    $age = Carbon::parse($p->resident->birth_date)->age;
                }
                return [
                    'id'                      => $p->id,
                    'resident_id'             => $p->resident_id,
                    'name'                    => $p->resident?->full_name ?? 'Unknown',
                    'age'                     => $age,
                    'last_menstrual_period'   => $p->last_menstrual_period,
                    'expected_delivery_date'  => $p->expected_delivery_date,
                    'gestational_age'         => $p->gestational_age,
                    'gravida'                 => $p->gravida,
                    'para'                    => $p->para,
                    'risk_level'              => $p->risk_level,
                    'immunization_status'     => $p->immunization_status,
                ];
            })
            ->toArray();
    }

    private function midwifeLactatingList(array $range): array
    {
        return LactatingRecord::with('resident')
            ->whereHas('patientRecord', function ($q) use ($range) {
                if ($range['from']) $q->whereDate('created_at', '>=', $range['from']);
                if ($range['to'])   $q->whereDate('created_at', '<=', $range['to']);
            })
            ->latest()
            ->get()
            ->map(function ($l) {
                $age = null;
                if ($l->resident && $l->resident->birth_date) {
                    $age = Carbon::parse($l->resident->birth_date)->age;
                }
                return [
                    'id'                     => $l->id,
                    'resident_id'            => $l->resident_id,
                    'name'                   => $l->resident?->full_name ?? 'Unknown',
                    'age'                    => $age,
                    'breastfeeding_status'   => $l->breastfeeding_status,
                    'infant_age'             => $l->infant_age,
                    'feeding_method'         => $l->feeding_method,
                    'latching_assessment'    => $l->latching_assessment,
                    'nutritional_status'     => $l->nutritional_status,
                    'infant_weight'          => $l->infant_weight,
                    'infant_health_status'   => $l->infant_health_status,
                ];
            })
            ->toArray();
    }

    private function midwifeInfantList(array $range): array
    {
        // Residents under 1 year old who have a child patient record
        $infantResidentIds = Resident::where('birth_date', '>=', Carbon::today()->subYear())
            ->pluck('id');

        $records = ChildRecord::with('resident')
            ->whereIn('resident_id', $infantResidentIds)
            ->whereHas('patientRecord', function ($q) use ($range) {
                if ($range['from']) $q->whereDate('created_at', '>=', $range['from']);
                if ($range['to'])   $q->whereDate('created_at', '<=', $range['to']);
            })
            ->latest()
            ->get();

        return $records->map(function ($c) {
            $ageInMonths = null;
            if ($c->resident && $c->resident->birth_date) {
                $ageInMonths = Carbon::parse($c->resident->birth_date)->diffInMonths(Carbon::today());
            }

            return [
                'id'                         => $c->id,
                'resident_id'                => $c->resident_id,
                'name'                       => $c->resident?->full_name ?? 'Unknown',
                'gender'                     => $c->resident?->gender,
                'birth_date'                 => $c->resident?->birth_date,
                'age_months'                 => $ageInMonths,
                'birth_weight'               => $c->birth_weight,
                'birth_height'               => $c->birth_height,
                'birth_head_circumference'   => $c->birth_head_circumference,
                'gestational_age_at_birth'   => $c->gestational_age_at_birth,
                'birth_type'                 => $c->birth_type,
                'current_weight'             => $c->current_weight,
                'current_height'             => $c->current_height,
                'current_muac'               => $c->current_muac,
                'current_nutritional_status' => $c->current_nutritional_status,
                'immunization_history'       => $c->immunization_history,
            ];
        })->toArray();
    }

    private function midwifeMonthlyTrend(array $range): array
    {
        $start = Carbon::today()->subMonths(11)->startOfMonth();

        $prenatal = CheckupRecord::select(
            DB::raw("DATE_FORMAT(checkup_date, '%Y-%m') as ym"),
            DB::raw("COUNT(*) as total"),
        )
            ->where('checkup_type', 'pregnancy')
            ->whereDate('checkup_date', '>=', $start)
            ->groupBy('ym')->get()->keyBy('ym');

        $postpartum = CheckupRecord::select(
            DB::raw("DATE_FORMAT(checkup_date, '%Y-%m') as ym"),
            DB::raw("COUNT(*) as total"),
        )
            ->where('checkup_type', 'lactating')
            ->whereDate('checkup_date', '>=', $start)
            ->groupBy('ym')->get()->keyBy('ym');

        $out = [];
        for ($i = 0; $i < 12; $i++) {
            $d = $start->copy()->addMonths($i);
            $key = $d->format('Y-m');
            $out[] = [
                'month'      => $d->format('M Y'),
                'prenatal'   => (int) ($prenatal[$key]->total ?? 0),
                'postpartum' => (int) ($postpartum[$key]->total ?? 0),
            ];
        }
        return $out;
    }

    private function midwifeRiskFlags(): array
    {
        $highRisk = PregnancyRecord::where('risk_level', 'high')
            ->with('resident')
            ->latest()->limit(20)->get()
            ->map(fn($p) => [
                'resident_id' => $p->resident_id,
                'name'        => $p->resident?->full_name ?? 'Unknown',
                'detail'      => 'High-risk pregnancy',
                'since'       => $p->created_at?->toDateString(),
            ])->toArray();

        $malnourishedInfants = ChildRecord::whereIn('current_nutritional_status', [
            'severely_underweight',
            'severely_wasted',
            'wasted',
            'underweight',
        ])
            ->whereHas('resident', function ($q) {
                $q->where('birth_date', '>=', Carbon::today()->subYear());
            })
            ->with('resident')
            ->latest()->limit(20)->get()
            ->map(fn($c) => [
                'resident_id' => $c->resident_id,
                'name'        => $c->resident?->full_name ?? 'Unknown',
                'detail'      => 'Infant — ' . str_replace('_', ' ', $c->current_nutritional_status ?? 'unknown'),
                'since'       => $c->created_at?->toDateString(),
            ])->toArray();

        return [
            'high_risk_pregnancies' => $highRisk,
            'malnourished_infants'  => $malnourishedInfants,
        ];
    }

    /* ============================================================
       NDP REPORT
       ============================================================ */

    private function buildNdpReport(array $range): array
    {
        return [
            'stats'         => $this->ndpStats($range),
            'senior'        => $this->ndpList($range, 'senior'),
            'adult'         => $this->ndpList($range, 'adult'),
            'teen'          => $this->ndpList($range, 'teen'),
            'children'      => $this->ndpList($range, 'children'),
            'age_groups'    => $this->ndpAgeGroups($range),
            'monthly_trend' => $this->ndpMonthlyTrend($range),
            'risk_flags'    => $this->ndpRiskFlags(),
        ];
    }

    private function ndpStats(array $range): array
    {
        $base = PatientRecord::query();
        if ($range['from']) $base->whereDate('created_at', '>=', $range['from']);
        if ($range['to'])   $base->whereDate('created_at', '<=', $range['to']);

        $seniorIds   = Resident::where('birth_date', '<=', Carbon::today()->subYears(60))->pluck('id');
        $adultIds    = Resident::whereBetween('birth_date', [
            Carbon::today()->subYears(60)->addDay(),
            Carbon::today()->subYears(19),
        ])->pluck('id');
        $teenIds     = Resident::whereBetween('birth_date', [
            Carbon::today()->subYears(19)->addDay(),
            Carbon::today()->subYears(13),
        ])->pluck('id');
        $childrenIds = Resident::where('birth_date', '>', Carbon::today()->subYears(13))->pluck('id');

        return [
            'senior'   => (clone $base)->whereIn('resident_id', $seniorIds)->count(),
            'adult'    => (clone $base)->whereIn('resident_id', $adultIds)->count(),
            'teen'     => (clone $base)->whereIn('resident_id', $teenIds)->count(),
            'children' => (clone $base)->whereIn('resident_id', $childrenIds)->count(),
            'total_checkups'  => CheckupRecord::when($range['from'], fn($q) => $q->whereDate('checkup_date', '>=', $range['from']))
                ->when($range['to'], fn($q) => $q->whereDate('checkup_date', '<=', $range['to']))
                ->count(),
            'today_checkups'  => CheckupRecord::whereDate('checkup_date', Carbon::today())->count(),
            'pending_followups' => CheckupRecord::whereNotNull('follow_up_date')
                ->whereDate('follow_up_date', '>=', Carbon::today())->count(),
            'overdue_followups' => CheckupRecord::whereNotNull('follow_up_date')
                ->whereDate('follow_up_date', '<', Carbon::today())
                ->where('status', 'completed')->count(),
        ];
    }

    /**
     * Unified list for NDP cohorts.
     * $cohort = senior | adult | teen | children
     */
    private function ndpList(array $range, string $cohort): array
    {
        $today = Carbon::today();

        $ageFilter = match ($cohort) {
            'senior'   => ['min' => 60,     'max' => null],
            'adult'    => ['min' => 19,     'max' => 59],
            'teen'     => ['min' => 13,     'max' => 18],
            'children' => ['min' => 0,      'max' => 12],
            default    => ['min' => 0,      'max' => null],
        };

        $residentsQuery = Resident::query();
        if ($ageFilter['max'] !== null) {
            $residentsQuery
                ->where('birth_date', '<=', $today->copy()->subYears($ageFilter['min']))
                ->where('birth_date', '>', $today->copy()->subYears($ageFilter['max'] + 1));
        } else {
            $residentsQuery->where('birth_date', '<=', $today->copy()->subYears($ageFilter['min']));
        }

        $residentIds = $residentsQuery->pluck('id');

        $records = PatientRecord::with(['resident', 'checkups'])
            ->whereIn('resident_id', $residentIds)
            ->when($range['from'], fn($q) => $q->whereDate('created_at', '>=', $range['from']))
            ->when($range['to'],   fn($q) => $q->whereDate('created_at', '<=', $range['to']))
            ->latest()
            ->get();

        return $records->map(function ($r) {
            $age = null;
            if ($r->resident && $r->resident->birth_date) {
                $age = Carbon::parse($r->resident->birth_date)->age;
            }
            $lastCheckup = $r->checkups->sortByDesc('checkup_date')->first();

            return [
                'id'             => $r->id,
                'resident_id'    => $r->resident_id,
                'name'           => $r->resident?->full_name ?? 'Unknown',
                'age'            => $age,
                'gender'         => $r->resident?->gender,
                'patient_type'   => $r->patient_type,
                'status'         => $r->status,
                'contact'        => $r->resident?->phone_number,
                'last_checkup'   => $lastCheckup?->checkup_date,
                'total_checkups' => $r->checkups->count(),
            ];
        })->toArray();
    }

    private function ndpAgeGroups(array $range): array
    {
        $buckets = [
            '1-2',
            '3-4',
            '5-9',
            '10-12',
            '13-18',
            '19-24',
            '25-29',
            '30-34',
            '35-39',
            '40-44',
            '45-49',
            '50-54',
            '55-59',
            '60-64',
            '65 above',
        ];

        $residents = Resident::whereHas('patientRecords', function ($q) use ($range) {
            if ($range['from']) $q->whereDate('created_at', '>=', $range['from']);
            if ($range['to'])   $q->whereDate('created_at', '<=', $range['to']);
        })->get();

        $groups = array_fill_keys($buckets, 0);
        $total  = 0;

        foreach ($residents as $r) {
            $age = $r->age;
            if ($age === null) continue;
            $total++;
            if ($age <= 2)  $groups['1-2']++;
            elseif ($age <= 4)  $groups['3-4']++;
            elseif ($age <= 9)  $groups['5-9']++;
            elseif ($age <= 12) $groups['10-12']++;
            elseif ($age <= 18) $groups['13-18']++;
            elseif ($age <= 24) $groups['19-24']++;
            elseif ($age <= 29) $groups['25-29']++;
            elseif ($age <= 34) $groups['30-34']++;
            elseif ($age <= 39) $groups['35-39']++;
            elseif ($age <= 44) $groups['40-44']++;
            elseif ($age <= 49) $groups['45-49']++;
            elseif ($age <= 54) $groups['50-54']++;
            elseif ($age <= 59) $groups['55-59']++;
            elseif ($age <= 64) $groups['60-64']++;
            else                $groups['65 above']++;
        }

        return ['groups' => $groups, 'total' => $total];
    }

    private function ndpMonthlyTrend(array $range): array
    {
        $start = Carbon::today()->subMonths(11)->startOfMonth();

        $rows = CheckupRecord::select(
            DB::raw("DATE_FORMAT(checkup_date, '%Y-%m') as ym"),
            DB::raw("COUNT(*) as total"),
        )
            ->whereDate('checkup_date', '>=', $start)
            ->groupBy('ym')->orderBy('ym')->get()->keyBy('ym');

        $out = [];
        for ($i = 0; $i < 12; $i++) {
            $d = $start->copy()->addMonths($i);
            $key = $d->format('Y-m');
            $out[] = [
                'month' => $d->format('M Y'),
                'total' => (int) ($rows[$key]->total ?? 0),
            ];
        }
        return $out;
    }

    private function ndpRiskFlags(): array
    {
        $fallsRisk = SeniorRecord::where('falls_risk_score', '>=', 7)
            ->with('resident')->latest()->limit(20)->get()
            ->map(fn($s) => [
                'resident_id' => $s->resident_id,
                'name'        => $s->resident?->full_name ?? 'Unknown',
                'detail'      => 'Senior — high falls risk (' . $s->falls_risk_score . '/10)',
                'since'       => $s->created_at?->toDateString(),
            ])->toArray();

        $criticalNcd = NcdRecord::where('current_status', 'critical')
            ->with('resident')->latest()->limit(20)->get()
            ->map(fn($n) => [
                'resident_id' => $n->resident_id,
                'name'        => $n->resident?->full_name ?? 'Unknown',
                'detail'      => 'NCD — critical: ' . ($n->ncd_classification ?? 'N/A'),
                'since'       => $n->created_at?->toDateString(),
            ])->toArray();

        $malnourishedChildren = ChildRecord::whereIn('current_nutritional_status', [
            'severely_underweight',
            'severely_wasted',
            'wasted',
            'underweight',
        ])
            ->with('resident')->latest()->limit(20)->get()
            ->map(fn($c) => [
                'resident_id' => $c->resident_id,
                'name'        => $c->resident?->full_name ?? 'Unknown',
                'detail'      => 'Child — ' . str_replace('_', ' ', $c->current_nutritional_status ?? 'unknown'),
                'since'       => $c->created_at?->toDateString(),
            ])->toArray();

        return [
            'falls_risk_seniors'    => $fallsRisk,
            'critical_ncd'          => $criticalNcd,
            'malnourished_children' => $malnourishedChildren,
        ];
    }

    /* ============================================================
       HELPERS
       ============================================================ */

    private function resolveDateRange(Request $request): array
    {
        $preset = $request->input('preset', 'month');
        $today  = Carbon::today();

        switch ($preset) {
            case 'today':
                $from = $today->copy();
                $to = $today->copy();
                break;
            case 'week':
                $from = $today->copy()->startOfWeek();
                $to = $today->copy();
                break;
            case 'month':
                $from = $today->copy()->startOfMonth();
                $to = $today->copy();
                break;
            case 'year':
                $from = $today->copy()->startOfYear();
                $to = $today->copy();
                break;
            case 'custom':
                $from = $request->filled('from') ? Carbon::parse($request->input('from')) : $today->copy()->startOfMonth();
                $to   = $request->filled('to')   ? Carbon::parse($request->input('to'))   : $today->copy();
                break;
            case 'all':
            default:
                $from = null;
                $to = null;
        }

        return [
            'preset' => $preset,
            'from'   => $from?->toDateString(),
            'to'     => $to?->toDateString(),
        ];
    }
}
