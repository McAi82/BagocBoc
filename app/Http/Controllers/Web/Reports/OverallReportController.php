<?php
// app/Http/Controllers/Web/Reports/OverallReportController.php

namespace App\Http\Controllers\Web\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Super Admin "Overall Reports"
 *
 * One endpoint that aggregates every module (population, services, finance,
 * health, system) into a single payload.
 *
 * Filters
 *  - date_from / date_to : applied to TRANSACTIONAL data (certifications,
 *                          clearances, front desk, payments, tax, penalties,
 *                          checkups, assessments, activity logs). Population
 *                          and registry data are snapshots (current totals).
 *  - zone_id             : limits everything that can be traced to a resident
 *                          (via resident_households -> households ->
 *                          household_addresses.zone).
 */
class OverallReportController extends Controller
{
    private ?Carbon $from = null;
    private ?Carbon $to = null;
    private ?int $zoneId = null;
    private array $sectionErrors = [];

    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || !$this->isSuperAdmin($user->id)) {
            return $this->respondError('Only a Super Admin can view overall reports.', null, 403);
        }

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to'   => 'nullable|date|after_or_equal:date_from',
            'zone_id'   => 'nullable|integer|exists:barangay_zones,id',
        ]);

        $this->from   = $request->filled('date_from') ? Carbon::parse($request->date_from)->startOfDay() : null;
        $this->to     = $request->filled('date_to') ? Carbon::parse($request->date_to)->endOfDay() : null;
        $this->zoneId = $request->filled('zone_id') ? (int) $request->zone_id : null;

        $population = [
            'residents'  => $this->safe('residents', fn() => $this->residents()),
            'households' => $this->safe('households', fn() => $this->households()),
            'zones'      => $this->safe('zones', fn() => $this->zones()),
        ];

        $services = [
            'certifications' => $this->safe('certifications', fn() => $this->certifications()),
            'clearances'     => $this->safe('clearances', fn() => $this->clearances()),
            'frontdesk'      => $this->safe('frontdesk', fn() => $this->frontDesk()),
        ];

        $finance = $this->safe('finance', fn() => $this->finance());
        $health  = $this->safe('health', fn() => $this->health());
        $system  = $this->safe('system', fn() => $this->system());

        $summary = [
            'total_residents'          => (int) data_get($population, 'residents.total', 0),
            'total_households'         => (int) data_get($population, 'households.total', 0),
            'total_collections'        => (float) data_get($finance, 'total_collections', 0),
            'outstanding_penalties'    => (float) data_get($finance, 'penalties.pending_amount', 0),
            'certifications_in_period' => (int) data_get($services, 'certifications.total', 0),
            'clearances_in_period'     => (int) data_get($services, 'clearances.total', 0),
            'frontdesk_in_period'      => (int) data_get($services, 'frontdesk.requests_total', 0),
            'pending_certifications'   => $this->statusValue(data_get($services, 'certifications.by_status', []), ['Pending', 'In Review']),
            'pending_clearances'       => $this->statusValue(data_get($services, 'clearances.by_status', []), ['pending']),
            'pending_frontdesk'        => $this->statusValue(data_get($services, 'frontdesk.by_status', []), ['pending', 'processing']),
            'health_patients'          => (int) data_get($health, 'patients.total', 0),
            'active_users'             => (int) data_get($system, 'users.active', 0),
        ];

        $zoneName = null;
        if ($this->zoneId) {
            $zoneName = DB::table('barangay_zones')->where('id', $this->zoneId)->value('name');
        }

        return $this->respondSuccess([
            'meta' => [
                'generated_at'   => now()->toIso8601String(),
                'generated_by'   => $user->email,
                'filters'        => [
                    'date_from' => $this->from?->toDateString(),
                    'date_to'   => $this->to?->toDateString(),
                    'zone_id'   => $this->zoneId,
                    'zone_name' => $zoneName,
                ],
                'notes'          => [
                    'Population, household and health registry figures are current snapshots and are not limited by the date range.',
                    'Date range applies to certifications, clearances, front desk, payments, tax, penalties, checkups, assessments and activity logs.',
                    'Resident counts and demographics include living (alive) residents only; deceased and decedent (deceased property owner) records are reported separately.',
                ],
                'section_errors' => $this->sectionErrors,
            ],
            'summary'    => $summary,
            'population' => $population,
            'services'   => $services,
            'finance'    => $finance,
            'health'     => $health,
            'system'     => $system,
        ]);
    }

    /* ============================================================
     | SECTIONS
     ============================================================ */

    private function residents(): array
    {
        // $all = every resident record; $q = living residents only.
        // (vital_status: alive / deceased / decedent = deceased property owner)
        $hasVital = Schema::hasColumn('residents', 'vital_status');

        $all = DB::table('residents');
        if ($this->zoneId) {
            $all->whereIn('residents.id', $this->residentIdsInZone($this->zoneId));
        }

        $q = clone $all;
        if ($hasVital) {
            $q->where('residents.vital_status', 'alive');
        }

        $total = (clone $q)->count();
        $deceased = $hasVital ? (clone $all)->where('residents.vital_status', 'deceased')->count() : 0;
        $decedent = $hasVital ? (clone $all)->where('residents.vital_status', 'decedent')->count() : 0;

        $newInPeriod = null;
        if ($this->from || $this->to) {
            $n = clone $q;
            if ($this->from) $n->where('residents.created_at', '>=', $this->from);
            if ($this->to)   $n->where('residents.created_at', '<=', $this->to);
            $newInPeriod = $n->count();
        }

        $buckets = ['0-12' => 0, '13-18' => 0, '19-35' => 0, '36-60' => 0, '60+' => 0];
        $seniors = 0;
        foreach ((clone $q)->whereNotNull('birth_date')->pluck('birth_date') as $birth) {
            $age = max(0, Carbon::parse($birth)->age);
            if ($age <= 12)      $buckets['0-12']++;
            elseif ($age <= 18)  $buckets['13-18']++;
            elseif ($age <= 35)  $buckets['19-35']++;
            elseif ($age <= 60)  $buckets['36-60']++;
            else                 $buckets['60+']++;
            if ($age >= 60) $seniors++;
        }

        $pwd = null;
        if (Schema::hasColumn('residents', 'PSC_with_disability')) {
            $pwd = (clone $q)->where('PSC_with_disability', true)->count();
        }

        return [
            'total'        => $total,
            'total_records' => (clone $all)->count(),
            'deceased'     => $deceased,
            'decedent'     => $decedent,
            'vital_status' => $hasVital
                ? $this->groupCount(clone $all, 'residents.vital_status')
                : [['label' => 'alive', 'value' => $total]],
            'new_in_period' => $newInPeriod,
            'seniors'      => $seniors,
            'pwd'          => $pwd,
            'gender'       => $this->groupCount(clone $q, 'residents.gender'),
            'age_groups'   => collect($buckets)->map(fn($v, $k) => ['label' => $k, 'value' => $v])->values()->all(),
            'civil_status' => $this->groupCount(clone $q, 'residents.civil_status'),
            'voter_status' => $this->groupCount(clone $q, 'residents.voter_status'),
            'status'       => $this->groupCount(clone $q, 'residents.status'),
        ];
    }

    private function households(): array
    {
        $q = DB::table('households');
        if ($this->zoneId) {
            $q->whereIn('households.address_id', function ($s) {
                $s->select('id')->from('household_addresses')->where('zone', $this->zoneId);
            });
        }

        $ids = (clone $q)->select('households.id');

        return [
            'total'          => (clone $q)->count(),
            'by_status'      => $this->groupCount(clone $q, 'households.status'),
            'with_geotag'    => DB::table('house_geotags')->whereIn('household_id', $ids)->count(),
            'census_records' => DB::table('household_census_records')->whereIn('household_id', $ids)->count(),
        ];
    }

    private function zones(): array
    {
        $q = DB::table('barangay_zones as z')
            ->leftJoin('household_addresses as a', 'a.zone', '=', 'z.id')
            ->leftJoin('households as h', 'h.address_id', '=', 'a.id')
            ->leftJoin('resident_households as rh', function ($j) {
                $j->on('rh.household_id', '=', 'h.id')->where('rh.status', '=', 'active');
            })
            ->leftJoin('residents as r', function ($j) {
                $j->on('r.id', '=', 'rh.resident_id');
                if (Schema::hasColumn('residents', 'vital_status')) {
                    $j->where('r.vital_status', '=', 'alive');
                }
            })
            ->select(
                'z.id as zone_id',
                'z.zone_number',
                'z.name as zone_name',
                DB::raw('COUNT(DISTINCT h.id) as households'),
                DB::raw('COUNT(DISTINCT r.id) as residents')
            )
            ->groupBy('z.id', 'z.zone_number', 'z.name')
            ->orderBy('z.zone_number');

        if ($this->zoneId) {
            $q->where('z.id', $this->zoneId);
        }

        return $q->get()->map(fn($r) => [
            'zone_id'     => (int) $r->zone_id,
            'zone_number' => (int) $r->zone_number,
            'zone_name'   => $r->zone_name,
            'households'  => (int) $r->households,
            'residents'   => (int) $r->residents,
        ])->all();
    }

    private function certifications(): array
    {
        $base = fn() => $this->certBase();

        $feesCollected = DB::table('certificate_payments')
            ->where('status', 'Paid')
            ->whereIn('certification_id', $base()->select('certifications.id'))
            ->sum('amount');

        return [
            'total'          => $base()->count(),
            'by_status'      => $this->groupCount($base(), 'certifications.status'),
            'by_channel'     => $this->groupCount($base(), 'certifications.submission_channel'),
            'payment_status' => $this->groupCount($base(), 'certifications.payment_status'),
            'by_type'        => $this->groupCount(
                $base()->leftJoin('certification_types as t', 't.id', '=', 'certifications.certification_type_id'),
                't.name'
            ),
            'fees_collected' => (float) $feesCollected,
        ];
    }

    private function clearances(): array
    {
        $base = fn() => $this->base('clearances');

        return [
            'total'         => $base()->count(),
            'by_status'     => $this->groupCount($base(), 'clearances.status'),
            'fees_released' => (float) $base()->where('clearances.status', 'released')->sum('clearances.amount'),
        ];
    }

    private function frontDesk(): array
    {
        $base = fn() => $this->base('front_desk_requests');

        return [
            'requests_total' => $base()->count(),
            'by_status'      => $this->groupCount($base(), 'front_desk_requests.status'),
            'by_service'     => $this->groupCount($base(), 'front_desk_requests.service_type'),
            'by_priority'    => $this->groupCount($base(), 'front_desk_requests.priority'),
            'appointments'   => $this->groupCount($this->base('front_desk_appointments'), 'front_desk_appointments.status'),
            'claim_slips'    => $this->groupCount($this->base('front_desk_claim_slips'), 'front_desk_claim_slips.status'),
            'queue_waiting'  => $this->base('front_desk_queue', null)->where('front_desk_queue.status', 'waiting')->count(),
        ];
    }

    private function finance(): array
    {
        $pay = fn() => $this->base('payments')->where('payments.status', 'completed');
        $tax = fn() => $this->base('tax_payments')->where('tax_payments.status', 'paid');
        $pen = fn() => $this->base('penalties');

        $paymentsTotal = (float) $pay()->sum('payments.amount');
        $taxTotal      = (float) $tax()->sum('tax_payments.amount');

        $penaltySum = fn(string $status) => (float) $pen()->where('penalties.status', $status)->sum('penalties.amount');

        return [
            'total_collections' => $paymentsTotal + $taxTotal,
            'payments' => [
                'count'     => $pay()->count(),
                'total'     => $paymentsTotal,
                'by_type'   => $this->groupSum($pay(), 'payments.payment_type', 'payments.amount'),
                'by_method' => $this->groupSum($pay(), 'payments.payment_method', 'payments.amount'),
                'by_status' => $this->groupCount($this->base('payments'), 'payments.status'),
            ],
            'tax' => [
                'count'     => $tax()->count(),
                'total'     => $taxTotal,
                'by_type'   => $this->groupSum($tax(), 'tax_payments.tax_type', 'tax_payments.amount'),
                'by_method' => $this->groupSum($tax(), 'tax_payments.payment_method', 'tax_payments.amount'),
            ],
            'penalties' => [
                'count'          => $pen()->count(),
                'total_amount'   => (float) $pen()->sum('penalties.amount'),
                'paid_amount'    => $penaltySum('paid'),
                'pending_amount' => $penaltySum('pending'),
                'waived_amount'  => $penaltySum('waived'),
                'by_status'      => $this->groupCount($pen(), 'penalties.status'),
            ],
            'monthly' => $this->monthlyCollections(),
        ];
    }

    private function health(): array
    {
        $patients = fn() => $this->base('patient_records', null);

        $newInPeriod = null;
        if ($this->from || $this->to) {
            $newInPeriod = $this->base('patient_records')->count();
        }

        $checkups = fn() => $this->base('checkup_records');
        $programs = DB::table('programs');
        if ($this->from) $programs->where('programs.start_date', '>=', $this->from->toDateString());
        if ($this->to)   $programs->where('programs.start_date', '<=', $this->to->toDateString());

        $assessments = DB::table('nutrition_assessments');
        if ($this->from) $assessments->where('assessment_date', '>=', $this->from->toDateString());
        if ($this->to)   $assessments->where('assessment_date', '<=', $this->to->toDateString());
        if ($this->zoneId) {
            $assessments->whereIn('participant_id', function ($s) {
                $s->select('id')->from('program_participants')
                    ->whereIn('resident_id', $this->residentIdsInZone($this->zoneId));
            });
        }

        return [
            'patients' => [
                'total'         => $patients()->count(),
                'new_in_period' => $newInPeriod,
                'by_type'       => $this->groupCount($patients(), 'patient_records.patient_type'),
                'by_status'     => $this->groupCount($patients(), 'patient_records.status'),
            ],
            'pregnancy_risk'  => $this->groupCount($this->base('pregnancy_records', null), 'pregnancy_records.risk_level'),
            'child_nutrition' => $this->groupCount($this->base('child_records', null), 'child_records.current_nutritional_status'),
            'ncd_status'      => $this->groupCount($this->base('ncd_records', null), 'ncd_records.current_status'),
            'ncd_types'       => $this->groupCount($this->base('ncd_records', null), 'ncd_records.ncd_classification'),
            'checkups' => [
                'total'   => $checkups()->count(),
                'by_type' => $this->groupCount($checkups(), 'checkup_records.checkup_type'),
            ],
            'programs' => [
                'total'        => (clone $programs)->count(),
                'by_status'    => $this->groupCount(clone $programs, 'programs.status'),
                'participants' => $this->groupCount(
                    $this->base('program_participants', null)->whereIn('program_participants.program_id', (clone $programs)->select('programs.id')),
                    'program_participants.status'
                ),
            ],
            'nutrition_assessments' => $this->groupCount($assessments, 'nutrition_assessments.nutrition_status'),
        ];
    }

    private function system(): array
    {
        $users = DB::table('users');

        $activity = DB::table('record_activity_logs');
        if ($this->from) $activity->where('created_at', '>=', $this->from);
        if ($this->to)   $activity->where('created_at', '<=', $this->to);

        $announcements = DB::table('announcements');
        if ($this->from) $announcements->where('created_at', '>=', $this->from);
        if ($this->to)   $announcements->where('created_at', '<=', $this->to);

        $byRole = DB::table('user_roles as ur')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->select('r.name as label', DB::raw('COUNT(DISTINCT ur.user_id) as cnt'))
            ->groupBy('r.name')
            ->orderByDesc('cnt')
            ->get()
            ->map(fn($r) => ['label' => $r->label, 'value' => (int) $r->cnt])
            ->all();

        $compliance = DB::table('compliance_requirements');
        if ($this->zoneId) $compliance->where('zone_id', $this->zoneId);

        return [
            'users' => [
                'total'    => (clone $users)->count(),
                'active'   => (clone $users)->where('account_status', 'active')->count(),
                'inactive' => (clone $users)->where('account_status', 'inactive')->count(),
                'by_role'  => $byRole,
            ],
            'announcements' => $this->groupCount($announcements, 'announcements.status'),
            'compliance'    => $this->groupCount($compliance, 'compliance_requirements.status'),
            'activity' => [
                'total'     => (clone $activity)->count(),
                'by_action' => array_slice($this->groupCount(clone $activity, 'record_activity_logs.action'), 0, 10),
            ],
        ];
    }

    /* ============================================================
     | QUERY HELPERS
     ============================================================ */

    /**
     * Base query with the date range (on created_at unless $dateCol is null)
     * and the zone filter (through $residentCol) applied. All columns are
     * table-qualified so the result can be safely joined.
     */
    private function base(string $table, ?string $dateCol = 'created_at', ?string $residentCol = 'resident_id')
    {
        $q = DB::table($table);

        if ($dateCol) {
            if ($this->from) $q->where("$table.$dateCol", '>=', $this->from);
            if ($this->to)   $q->where("$table.$dateCol", '<=', $this->to);
        }

        if ($residentCol && $this->zoneId) {
            $q->whereIn("$table.$residentCol", $this->residentIdsInZone($this->zoneId));
        }

        return $q;
    }

    /** Certifications are linked to residents through certificate_requesters. */
    private function certBase()
    {
        $q = $this->base('certifications', 'created_at', null)->whereNull('certifications.deleted_at');

        if ($this->zoneId) {
            $q->whereIn('certifications.requester_id', function ($s) {
                $s->select('id')->from('certificate_requesters')
                    ->whereIn('resident_id', $this->residentIdsInZone($this->zoneId));
            });
        }

        return $q;
    }

    private function residentIdsInZone(int $zoneId)
    {
        return DB::table('resident_households as rh')
            ->join('households as h', 'h.id', '=', 'rh.household_id')
            ->join('household_addresses as a', 'a.id', '=', 'h.address_id')
            ->where('a.zone', $zoneId)
            ->where('rh.status', 'active')
            ->select('rh.resident_id');
    }

    /** [{label, value}] — COUNT(*) per distinct value of $col. */
    private function groupCount($query, string $col): array
    {
        return $query
            ->select(DB::raw("$col as label"), DB::raw('COUNT(*) as cnt'))
            ->groupBy($col)
            ->orderByDesc('cnt')
            ->get()
            ->map(fn($r) => [
                'label' => $r->label === null || $r->label === '' ? 'Unknown' : (string) $r->label,
                'value' => (int) $r->cnt,
            ])
            ->values()
            ->all();
    }

    /** [{label, value, count}] — SUM($sumCol) per distinct value of $col. */
    private function groupSum($query, string $col, string $sumCol): array
    {
        return $query
            ->select(DB::raw("$col as label"), DB::raw("SUM($sumCol) as total"), DB::raw('COUNT(*) as cnt'))
            ->groupBy($col)
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => [
                'label' => $r->label === null || $r->label === '' ? 'Unknown' : (string) $r->label,
                'value' => (float) $r->total,
                'count' => (int) $r->cnt,
            ])
            ->values()
            ->all();
    }

    /** Month-by-month collections (payments + tax), grouped in PHP so it works on any DB. */
    private function monthlyCollections(): array
    {
        $end   = ($this->to ?? now())->copy()->endOfMonth();
        $start = ($this->from ?? now()->subMonths(11))->copy()->startOfMonth();

        if ($start->diffInMonths($end) > 35) {
            $start = $end->copy()->subMonths(35)->startOfMonth();
        }

        $months = [];
        for ($c = $start->copy(); $c->lte($end); $c->addMonth()) {
            $months[$c->format('Y-m')] = ['month' => $c->format('M Y'), 'payments' => 0.0, 'tax' => 0.0];
        }

        $collect = function (string $table, string $statusValue, string $field) use (&$months, $start, $end) {
            $q = DB::table($table)
                ->where("$table.status", $statusValue)
                ->where("$table.created_at", '>=', $start)
                ->where("$table.created_at", '<=', $end);

            if ($this->zoneId) {
                $q->whereIn("$table.resident_id", $this->residentIdsInZone($this->zoneId));
            }

            foreach ($q->get(["$table.created_at", "$table.amount"]) as $row) {
                $key = Carbon::parse($row->created_at)->format('Y-m');
                if (isset($months[$key])) {
                    $months[$key][$field] += (float) $row->amount;
                }
            }
        };

        $collect('payments', 'completed', 'payments');
        $collect('tax_payments', 'paid', 'tax');

        return collect($months)->map(fn($m) => $m + ['total' => $m['payments'] + $m['tax']])->values()->all();
    }

    private function statusValue(array $dist, array $labels): int
    {
        $wanted = array_map('strtolower', $labels);

        return (int) collect($dist)
            ->filter(fn($d) => in_array(strtolower($d['label']), $wanted, true))
            ->sum('value');
    }

    private function isSuperAdmin(int $userId): bool
    {
        return DB::table('user_roles')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('user_roles.user_id', $userId)
            ->where('roles.name', 'Super Admin')
            ->exists();
    }

    /** Run one section; if its tables/columns are missing, report it instead of failing the whole report. */
    private function safe(string $section, callable $fn, array $default = [])
    {
        try {
            return $fn();
        } catch (\Throwable $e) {
            Log::warning("OverallReport section [{$section}] failed: " . $e->getMessage());
            $this->sectionErrors[] = $section;

            return $default;
        }
    }
}
