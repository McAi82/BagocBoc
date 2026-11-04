<?php
// app/Http/Controllers/Web/Programs/ProgramRequestController.php

namespace App\Http\Controllers\Web\Programs;

use App\Http\Controllers\Controller;
use App\Models\Programrequest;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Program requests
 *
 *  - BNS, NDP and Midwives submit a request.
 *  - Barangay Secretary, Barangay Captain and Super Admin approve or reject it.
 *  - On approval the program is created and the approver chooses which users
 *    receive the program notification.
 */
class ProgramRequestController extends Controller
{
    use SendsNotifications;

    private const REQUESTER_ROLES = [
        'Barangay Nutrition Scholar',
        'Nurse Deployment Program',
        'Midwife',
    ];

    private const APPROVER_ROLES = [
        'Super Admin',
        'Barangay Captain',
        'Barangay Secretary',
    ];

    private const TYPE_LABELS = [
        'nutrition'     => 'Nutrition',
        'drug'          => 'Drug',
        'sexual_health' => 'Sexual Health',
        'maternal'      => 'Maternal',
        'other'         => 'Other',
    ];

    private const DEEP_LINK = '/barangay-bagocboc/program-requests';

    /* ============================================================
     | LIST / SHOW
     ============================================================ */

    public function index(Request $request)
    {
        [$isApprover, $isRequester] = $this->access();

        if (!$isApprover && !$isRequester) {
            return $this->respondError('You do not have access to program requests.', null, 403);
        }

        $query = ProgramRequest::with(['requester.resident', 'reviewer.resident']);

        // Requesters only ever see their own; approvers see everything
        if (!$isApprover || $request->boolean('mine')) {
            $query->where('requested_by_user_id', Auth::id());
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%")
                    ->orWhere('location', 'LIKE', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);

        $requests = $query->latest()->paginate($perPage)
            ->through(fn(ProgramRequest $r) => $this->format($r));

        return $this->respondSuccess($requests);
    }

    public function show($id)
    {
        $pr = ProgramRequest::with(['requester.resident', 'reviewer.resident'])->find($id);

        if (!$pr) {
            return $this->respondNotFound('Program request not found');
        }

        if (!$this->canView($pr)) {
            return $this->respondError('You are not allowed to view this request.', null, 403);
        }

        $data = $this->format($pr);
        $data['notified_users'] = $this->namesFor($pr->notified_user_ids ?? []);

        return $this->respondSuccess($data);
    }

    /* ============================================================
     | CREATE (BNS / NDP / Midwife)
     ============================================================ */

    public function store(Request $request)
    {
        [, $isRequester] = $this->access();

        if (!$isRequester) {
            return $this->respondError(
                'Only BNS, Nurse Deployment Program and Midwife accounts can request a program.',
                null,
                403
            );
        }

        $validator = Validator::make($request->all(), [
            'title'                => 'required|string|max:255',
            'description'          => 'nullable|string|max:5000',
            'justification'        => 'nullable|string|max:5000',
            'program_type'         => 'required|in:nutrition,drug,sexual_health,maternal,other',
            'start_date'           => 'required|date',
            'end_date'             => 'required|date|after_or_equal:start_date',
            'target_beneficiaries' => 'nullable|integer|min:1|max:1000000',
            'location'             => 'nullable|string|max:255',
            'budget'               => 'nullable|numeric|min:0|max:9999999999.99',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $pr = ProgramRequest::create($validator->validated() + [
            'requested_by_user_id' => Auth::id(),
            'status'               => 'pending',
        ]);

        // Tell every approver once (a user holding two approver roles gets one notice)
        $requesterName = $this->displayName(Auth::user());
        foreach ($this->approverIds() as $approverId) {
            if ($approverId === Auth::id()) {
                continue;
            }
            $this->notifyUser(
                $approverId,
                '📋 Program Request Awaiting Approval',
                "{$requesterName} requested a new program: '{$pr->title}' (" . self::TYPE_LABELS[$pr->program_type] . ').',
                'program',
                'high',
                self::DEEP_LINK . '?id=' . $pr->id,
                Auth::id(),
                'program_request',
                $pr->id
            );
        }

        return $this->respondSuccess(
            $this->format($pr->load(['requester.resident'])),
            'Program request submitted for approval',
            201
        );
    }

    public function cancel($id)
    {
        $pr = ProgramRequest::find($id);

        if (!$pr) {
            return $this->respondNotFound('Program request not found');
        }

        if ($pr->requested_by_user_id !== Auth::id()) {
            return $this->respondError('You can only cancel your own request.', null, 403);
        }

        if (!$pr->isPending()) {
            return $this->respondError('Only pending requests can be cancelled.', null, 422);
        }

        $pr->update(['status' => 'cancelled']);

        return $this->respondSuccess($this->format($pr->load(['requester.resident'])), 'Request cancelled');
    }

    /* ============================================================
     | REVIEW (Secretary / Captain / Super Admin)
     ============================================================ */

    /** Users that can be picked as notification recipients. */
    public function recipients()
    {
        [$isApprover] = $this->access();

        if (!$isApprover) {
            return $this->respondError('Only approvers can choose recipients.', null, 403);
        }

        $roles = DB::table('user_roles')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->select('user_roles.user_id', 'roles.name')
            ->get()
            ->groupBy('user_id');

        $users = DB::table('users')
            ->leftJoin('residents', 'residents.id', '=', 'users.resident_id')
            ->where('users.account_status', 'active')
            ->select('users.id', 'users.email', 'residents.first_name', 'residents.middle_name', 'residents.last_name')
            ->get()
            ->map(function ($u) use ($roles) {
                $name = trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? ''));

                return [
                    'id'    => (int) $u->id,
                    'name'  => $name !== '' ? $name : $u->email,
                    'email' => $u->email,
                    'roles' => ($roles[$u->id] ?? collect())->pluck('name')->values()->all(),
                ];
            })
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();

        return $this->respondSuccess($users);
    }

    public function approve(Request $request, $id)
    {
        [$isApprover] = $this->access();

        if (!$isApprover) {
            return $this->respondError('Only the Secretary, Captain or Super Admin can approve requests.', null, 403);
        }

        $pr = ProgramRequest::with(['requester.resident'])->find($id);

        if (!$pr) {
            return $this->respondNotFound('Program request not found');
        }

        if (!$pr->isPending()) {
            return $this->respondError('Only pending requests can be approved.', null, 422);
        }

        $validator = Validator::make($request->all(), [
            'recipient_user_ids'   => 'required|array|min:1',
            'recipient_user_ids.*' => 'integer|distinct|exists:users,id',
            'remarks'              => 'nullable|string|max:2000',
        ], [
            'recipient_user_ids.required' => 'Choose at least one user to receive the program notification.',
            'recipient_user_ids.min'      => 'Choose at least one user to receive the program notification.',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $recipientIds = array_values(array_unique(array_map('intval', $validator->validated()['recipient_user_ids'])));

        try {
            DB::transaction(function () use ($pr, $request, $recipientIds) {
                $now = now();

                $programId = DB::table('programs')->insertGetId([
                    'programs'             => $pr->title,
                    'description'          => $pr->description,
                    'start_date'           => $pr->start_date->toDateString(),
                    'end_date'             => $pr->end_date->toDateString(),
                    'program_type'         => $pr->program_type,
                    'status'               => 'planned',
                    'budget'               => $pr->budget,
                    'target_beneficiaries' => $pr->target_beneficiaries,
                    'location'             => $pr->location,
                    'implementing_agency'  => $this->requesterRole($pr->requested_by_user_id),
                    'focal_person_id'      => $pr->requested_by_user_id,
                    'created_at'           => $now,
                    'updated_at'           => $now,
                ]);

                $pr->update([
                    'status'              => 'approved',
                    'reviewed_by_user_id' => Auth::id(),
                    'reviewed_at'         => $now,
                    'review_remarks'      => $request->input('remarks'),
                    'program_id'          => $programId,
                    'notified_user_ids'   => $recipientIds,
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('Program request approval failed', ['id' => $id, 'error' => $e->getMessage()]);

            return $this->respondError('Failed to approve the request: ' . $e->getMessage(), null, 500);
        }

        $pr->refresh()->load(['requester.resident', 'reviewer.resident']);

        $dates   = $pr->start_date->format('M j, Y') . ' - ' . $pr->end_date->format('M j, Y');
        $typeLbl = self::TYPE_LABELS[$pr->program_type];
        $by      = $this->displayName(Auth::user());

        // 1. Selected recipients (the requester gets their own message below)
        foreach ($recipientIds as $userId) {
            if ($userId === $pr->requested_by_user_id) {
                continue;
            }
            $this->notifyUser(
                $userId,
                "📣 New Program: {$pr->title}",
                "{$typeLbl} program '{$pr->title}' ({$dates}"
                    . ($pr->location ? ", {$pr->location}" : '')
                    . ') has been approved by ' . $by . '.',
                'program',
                'normal',
                self::DEEP_LINK . '?id=' . $pr->id,
                Auth::id(),
                'program_request',
                $pr->id
            );
        }

        // 2. The requester
        $this->notifyUser(
            $pr->requested_by_user_id,
            '✅ Program Request Approved',
            "Your program request '{$pr->title}' was approved and created. "
                . count($recipientIds) . ' user(s) were notified.'
                . ($pr->review_remarks ? " Remarks: {$pr->review_remarks}" : ''),
            'program',
            'high',
            self::DEEP_LINK . '?id=' . $pr->id,
            Auth::id(),
            'program_request',
            $pr->id
        );

        $data = $this->format($pr);
        $data['notified_users'] = $this->namesFor($recipientIds);

        return $this->respondSuccess($data, 'Request approved and program created');
    }

    public function reject(Request $request, $id)
    {
        [$isApprover] = $this->access();

        if (!$isApprover) {
            return $this->respondError('Only the Secretary, Captain or Super Admin can reject requests.', null, 403);
        }

        $pr = ProgramRequest::with(['requester.resident'])->find($id);

        if (!$pr) {
            return $this->respondNotFound('Program request not found');
        }

        if (!$pr->isPending()) {
            return $this->respondError('Only pending requests can be rejected.', null, 422);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $pr->update([
            'status'              => 'rejected',
            'reviewed_by_user_id' => Auth::id(),
            'reviewed_at'         => now(),
            'review_remarks'      => $request->reason,
        ]);

        $this->notifyUser(
            $pr->requested_by_user_id,
            '❌ Program Request Rejected',
            "Your program request '{$pr->title}' was rejected. Reason: {$request->reason}",
            'program',
            'high',
            self::DEEP_LINK . '?id=' . $pr->id,
            Auth::id(),
            'program_request',
            $pr->id
        );

        return $this->respondSuccess($this->format($pr->load(['reviewer.resident'])), 'Request rejected');
    }

    /* ============================================================
     | HELPERS
     ============================================================ */

    /** @return array{0:bool,1:bool} [isApprover, isRequester] */
    private function access(): array
    {
        $roles = $this->roleNames(Auth::id());

        return [
            count(array_intersect($roles, self::APPROVER_ROLES)) > 0,
            count(array_intersect($roles, self::REQUESTER_ROLES)) > 0,
        ];
    }

    private function canView(ProgramRequest $pr): bool
    {
        [$isApprover] = $this->access();

        return $isApprover || $pr->requested_by_user_id === Auth::id();
    }

    private function roleNames(?int $userId): array
    {
        if (!$userId) {
            return [];
        }

        return DB::table('user_roles')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('user_roles.user_id', $userId)
            ->pluck('roles.name')
            ->all();
    }

    private function requesterRole(int $userId): string
    {
        return array_values(array_intersect($this->roleNames($userId), self::REQUESTER_ROLES))[0]
            ?? 'Barangay Health Office';
    }

    /** Distinct ids of active users holding any approver role. */
    private function approverIds(): array
    {
        return DB::table('user_roles')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->join('users', 'users.id', '=', 'user_roles.user_id')
            ->whereIn('roles.name', self::APPROVER_ROLES)
            ->where('users.account_status', 'active')
            ->distinct()
            ->pluck('user_roles.user_id')
            ->map(fn($id) => (int) $id)
            ->all();
    }

    private function displayName($user): string
    {
        if (!$user) {
            return 'Unknown';
        }

        $user->loadMissing('resident');

        return $user->resident?->full_name ?: $user->email;
    }

    private function namesFor(array $userIds): array
    {
        if (empty($userIds)) {
            return [];
        }

        return DB::table('users')
            ->leftJoin('residents', 'residents.id', '=', 'users.resident_id')
            ->whereIn('users.id', $userIds)
            ->select('users.id', 'users.email', 'residents.first_name', 'residents.last_name')
            ->get()
            ->map(function ($u) {
                $name = trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? ''));

                return ['id' => (int) $u->id, 'name' => $name !== '' ? $name : $u->email];
            })
            ->values()
            ->all();
    }

    private function format(ProgramRequest $r): array
    {
        return [
            'id'                   => $r->id,
            'title'                => $r->title,
            'description'          => $r->description,
            'justification'        => $r->justification,
            'program_type'         => $r->program_type,
            'program_type_label'   => self::TYPE_LABELS[$r->program_type] ?? $r->program_type,
            'start_date'           => $r->start_date?->toDateString(),
            'end_date'             => $r->end_date?->toDateString(),
            'target_beneficiaries' => $r->target_beneficiaries,
            'location'             => $r->location,
            'budget'               => $r->budget !== null ? (float) $r->budget : null,
            'status'               => $r->status,
            'review_remarks'       => $r->review_remarks,
            'reviewed_at'          => $r->reviewed_at?->toIso8601String(),
            'program_id'           => $r->program_id,
            'notified_count'       => count($r->notified_user_ids ?? []),
            'requested_by_user_id' => $r->requested_by_user_id,
            'requester_name'       => $r->requester ? $this->displayName($r->requester) : null,
            'requester_role'       => $this->requesterRole($r->requested_by_user_id),
            'reviewer_name'        => $r->reviewer ? $this->displayName($r->reviewer) : null,
            'created_at'           => $r->created_at?->toIso8601String(),
        ];
    }
}
