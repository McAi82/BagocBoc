<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Clearance extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'processed_by_user_id',
        'reference_number',
        'purpose',
        'amount',
        'status',
        'issued_at',
        'valid_until',
        'remarks',
        'document_path',        // ✅ Path to the generated document
        'document_name',        // ✅ Name of the document
        'approved_at',          // ✅ When secretary approved
        'released_at',          // ✅ When document was released
        'received_at',          // ✅ When resident received/downloaded
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'valid_until' => 'date',
        'approved_at' => 'datetime',
        'released_at' => 'datetime',
        'received_at' => 'datetime',
    ];

    // ✅ Relationships
    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }

    // ✅ Helper methods for flow
    public function canApprove(): bool
    {
        return $this->status === 'pending';
    }

    public function canCreateDocument(): bool
    {
        return $this->status === 'approved';
    }

    public function canRelease(): bool
    {
        return $this->status === 'ready_for_release' && $this->document_path;
    }

    public function canReceive(): bool
    {
        return $this->status === 'released';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'released' && $this->received_at !== null;
    }

    // ✅ Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeReadyForRelease($query)
    {
        return $query->where('status', 'ready_for_release');
    }

    public function scopeReleased($query)
    {
        return $query->where('status', 'released');
    }
}