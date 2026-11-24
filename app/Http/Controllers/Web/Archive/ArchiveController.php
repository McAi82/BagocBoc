<?php
// app/Http/Controllers/Web/Archive/ArchiveController.php

namespace App\Http\Controllers\Web\Archive;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use App\Models\Clearance;
use App\Models\FrontDeskQueue;
use App\Models\FrontDeskRequest;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ArchiveController extends Controller
{
    use SendsNotifications; // same trait the other controllers use (respondSuccess/respondError)

    private const TYPES = [
        'certification' => Certification::class,
        'clearance'     => Clearance::class,
        'front_desk'    => FrontDeskRequest::class,
    ];

    private const RELATIONS = [
        'certification' => ['requester.resident', 'certificationType', 'archivedBy'],
        'clearance'     => ['resident', 'archivedBy'],
        'front_desk'    => ['resident', 'archivedBy'],
    ];

    /** Statuses that can no longer be deleted (already issued / finished). */
    private const FINAL_STATUSES = ['released', 'completed'];

    /**
     * GET /archive?type=all|certification|clearance|front_desk&reason=&search=&mine=1
     * Only items still inside the 15-day window are returned.
     */
    public function index(Request $request)
    {
        $type  = $request->query('type', 'all');
        $types = $type === 'all' ? array_keys(self::TYPES) : [$type];

        if (array_diff($types, array_keys(self::TYPES))) {
            return $this->respondError('Invalid archive type', null, 422);
        }

        $items = collect();

        foreach ($types as $t) {
            $class = self::TYPES[$t];

            $query = $class::onlyArchived()
                ->with(self::RELATIONS[$t])
                ->where('archived_at', '>', now()->subDays($class::archiveRetentionDays()));

            if ($request->filled('reason')) {
                $query->where('archive_reason', $request->reason);
            }
            if ($request->boolean('mine')) {
                $query->where('archived_by_user_id', Auth::id());
            }
            if ($request->filled('search')) {
                $query->where('reference_number', 'LIKE', '%' . $request->search . '%');
            }

            foreach ($query->orderByDesc('archived_at')->limit(100)->get() as $model) {
                $items->push($this->present($t, $model));
            }
        }

        return $this->respondSuccess(
            $items->sortByDesc('archived_at')->values()
        );
    }

    /**
     * DELETE /archive/{type}/{id}  -> "delete" = move to archive (reason: deleted)
     */
    public function archive($type, $id)
    {
        $class = self::TYPES[$type] ?? null;
        if (!$class) {
            return $this->respondError('Invalid archive type', null, 422);
        }

        $model = $class::find($id); // global scope: already-archived rows are not found
        if (!$model) {
            return $this->respondNotFound('Request not found');
        }

        if (in_array(strtolower((string) $model->status), self::FINAL_STATUSES, true)) {
            return $this->respondError('Completed or released requests cannot be deleted', null, 422);
        }

        DB::transaction(function () use ($type, $model) {
            if ($type === 'front_desk') {
                $this->dropFromQueue($model->id);
            }
            $model->archiveRecord(Auth::id(), 'deleted', $model->status);
        });

        return $this->respondSuccess(null, 'Request moved to archive. It will be permanently deleted after '
            . $class::archiveRetentionDays() . ' days.');
    }

    /**
     * POST /archive/{type}/{id}/restore
     * Only the user who cancelled / rejected / deleted it may restore it.
     */
    public function restore($type, $id)
    {
        $class = self::TYPES[$type] ?? null;
        if (!$class) {
            return $this->respondError('Invalid archive type', null, 422);
        }

        $model = $class::onlyArchived()->find($id);
        if (!$model) {
            return $this->respondNotFound('Archived request not found');
        }

        if ((int) $model->archived_by_user_id !== (int) Auth::id()) {
            return $this->respondError(
                "Only the user who {$model->archive_reason} this request can restore it",
                null,
                403
            );
        }

        if ($model->purge_at->isPast()) {
            return $this->respondError('The retention period has ended; this request can no longer be restored', null, 410);
        }

        $reset = [];
        if ($type === 'front_desk' && $model->archive_reason === 'cancelled') {
            $reset = ['cancelled_at' => null, 'cancelled_by_user_id' => null];
        }
        if (in_array($type, ['certification', 'clearance'], true) && $model->archive_reason === 'rejected') {
            $reset = ['remarks' => null];
        }

        $model->restoreFromArchive($reset);

        return $this->respondSuccess($model->fresh(), 'Request restored');
    }

    // ------------------------------------------------------------------

    private function present(string $type, $m): array
    {
        $resident = $type === 'certification' ? $m->requester?->resident : $m->resident;
        $purgeAt  = $m->purge_at;

        return [
            'type'                  => $type,
            'id'                    => $m->id,
            'reference_number'      => $m->reference_number,
            'resident_name'         => $resident ? ($resident->full_name ?? trim($resident->first_name . ' ' . $resident->last_name)) : 'Unknown',
            'label'                 => $type === 'certification' ? $m->certificationType?->name : ($m->service_type ?? 'Clearance'),
            'archive_reason'        => $m->archive_reason,
            'status_before_archive' => $m->status_before_archive,
            'remarks'               => $m->remarks ?? null,
            'archived_at'           => $m->archived_at,
            'purge_at'              => $purgeAt,
            'days_left'             => max(0, (int) ceil(($purgeAt->getTimestamp() - now()->getTimestamp()) / 86400)),
            'archived_by'           => $m->archivedBy ? [
                'id'   => $m->archivedBy->id,
                'name' => $m->archivedBy->name ?? trim(($m->archivedBy->first_name ?? '') . ' ' . ($m->archivedBy->last_name ?? '')),
            ] : null,
            'can_restore'           => (int) $m->archived_by_user_id === (int) Auth::id(),
        ];
    }

    private function dropFromQueue(int $requestId): void
    {
        $queue = FrontDeskQueue::where('request_id', $requestId)->first();
        if (!$queue) return;

        $position = $queue->position;
        $queue->delete();
        FrontDeskQueue::where('position', '>', $position)->decrement('position');
    }
}
