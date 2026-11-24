<?php
// app/Traits/Archivable.php

namespace App\Traits;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Archive (cancel / reject / delete) with a 15-day retention window.
 *
 * Editor hints only (no runtime effect): this trait is used by Eloquent models.
 *
 * @mixin \Illuminate\Database\Eloquent\Model
 * @phpstan-require-extends \Illuminate\Database\Eloquent\Model
 *
 * @property string|null $status
 * @property \Illuminate\Support\Carbon|null $archived_at
 * @property int|null $archived_by_user_id
 * @property string|null $archive_reason
 * @property string|null $status_before_archive
 * @property-read \Illuminate\Support\Carbon|null $purge_at
 *
 * Rows are hidden from every normal query via a global scope; the database
 * EVENT (see migration) hard-deletes them once the window has passed.
 */
trait Archivable
{
    public static function archiveRetentionDays(): int
    {
        return 15;
    }

    public static function bootArchivable(): void
    {
        static::addGlobalScope('notArchived', function (Builder $builder) {
            $builder->whereNull($builder->getModel()->getTable() . '.archived_at');
        });
    }

    public function scopeWithArchived(Builder $query): Builder
    {
        return $query->withoutGlobalScope('notArchived');
    }

    public function scopeOnlyArchived(Builder $query): Builder
    {
        return $query->withoutGlobalScope('notArchived')
            ->whereNotNull($this->getTable() . '.archived_at');
    }

    /**
     * For resident-facing (mobile) lists: active rows PLUS rows that were
     * rejected/cancelled and are still inside the retention window.
     * Rows archived as "deleted" by staff stay hidden from residents.
     */
    public function scopeWithOwnerArchive(Builder $query): Builder
    {
        $table = $this->getTable();

        return $query->withoutGlobalScope('notArchived')
            ->where(function ($q) use ($table) {
                $q->whereNull($table . '.archived_at')
                    ->orWhereIn($table . '.archive_reason', ['rejected', 'cancelled']);
            });
    }

    public function archivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by_user_id');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function getPurgeAtAttribute(): ?Carbon
    {
        return $this->archived_at
            ? Carbon::parse($this->archived_at)->addDays(static::archiveRetentionDays())
            : null;
    }

    public function archiveRecord(?int $userId, string $reason, ?string $statusBefore = null): void
    {
        $this->forceFill([
            'archived_at'           => now(),
            'archived_by_user_id'   => $userId,
            'archive_reason'        => $reason,
            'status_before_archive' => $statusBefore ?? $this->status,
        ])->save();
    }

    /** Un-archive and put the status back. $reset = extra columns to clear/reset. */
    public function restoreFromArchive(array $reset = []): void
    {
        $this->forceFill(array_merge([
            'status'                => $this->status_before_archive ?: $this->status,
            'archived_at'           => null,
            'archived_by_user_id'   => null,
            'archive_reason'        => null,
            'status_before_archive' => null,
        ], $reset))->save();
    }
}
