<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'requested_by_user_id',
        'title',
        'description',
        'justification',
        'program_type',
        'start_date',
        'end_date',
        'target_beneficiaries',
        'location',
        'budget',
        'status',
        'reviewed_by_user_id',
        'reviewed_at',
        'review_remarks',
        'program_id',
        'notified_user_ids',
    ];

    protected $casts = [
        'start_date'        => 'date:Y-m-d',
        'end_date'          => 'date:Y-m-d',
        'budget'            => 'decimal:2',
        'reviewed_at'       => 'datetime',
        'notified_user_ids' => 'array',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}
