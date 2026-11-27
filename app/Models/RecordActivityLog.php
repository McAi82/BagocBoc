<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\Relation;

class RecordActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'encoded_by',
        'record_id',
        'record_type',
        'action',
        'data_status',
        'details',
    ];

    public function encoder()
    {
        return $this->belongsTo(User::class, 'encoded_by');
    }

    public function record()
    {
        return $this->morphTo();
    }

    /**
     * True when a stored record_type points at a class (or morph-map alias)
     * that actually exists on this server.
     */
    public static function recordTypeExists(?string $type): bool
    {
        if (!$type) {
            return false;
        }

        $class = Relation::getMorphedModel($type) ?? $type;

        return class_exists($class);
    }

    /**
     * Eager-load `record` ONLY for record_types whose class exists.
     *
     * A plain with('record') instantiates every distinct record_type in the
     * result, so a single stale row (e.g. App\Models\SurveyResponse, which no
     * longer exists) crashes the whole request with a 500. Rows with an
     * unknown type simply come back with `record` = null.
     */
    public static function loadRecordsSafely(Collection $logs): Collection
    {
        $logs->groupBy('record_type')->each(function ($group, $type) {
            if (self::recordTypeExists($type)) {
                $group->load('record');
            }
        });

        return $logs;
    }
}
