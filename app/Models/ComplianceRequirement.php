<?php
// app/Models/ComplianceRequirement.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplianceRequirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'zone_id',
        'name',
        'description',
        'requirement',
        'penalty',
        'status',
        'due_date',
        'completed_at',
        'completion_notes',
        'completed_by_user_id',
        'is_active',
    ];

    protected $casts = [
        'penalty' => 'decimal:2',
        'due_date' => 'datetime',
        'completed_at' => 'datetime',
        'is_active' => 'string',
    ];

    // ============================================
    // RELATIONSHIPS
    // ============================================

    /**
     * Get the resident this compliance requirement belongs to
     */
    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    /**
     * Get the zone this compliance requirement belongs to
     */
    public function zone(): BelongsTo
    {
        return $this->belongsTo(BarangayZone::class, 'zone_id');
    }

    /**
     * Get the user who marked this as completed
     */
    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by_user_id');
    }

    // ============================================
    // SCOPES
    // ============================================

    /**
     * Scope a query to only include active requirements
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', 'active');
    }

    /**
     * Scope a query to only include pending requirements
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include completed requirements
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope a query to only include overdue requirements
     */
    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue')
            ->orWhere(function ($q) {
                $q->where('status', 'pending')
                    ->where('due_date', '<', now());
            });
    }

    /**
     * Scope a query by resident
     */
    public function scopeForResident($query, $residentId)
    {
        return $query->where('resident_id', $residentId);
    }

    /**
     * Scope a query by zone
     */
    public function scopeForZone($query, $zoneId)
    {
        return $query->where('zone_id', $zoneId);
    }

    // ============================================
    // HELPERS
    // ============================================

    /**
     * Check if the requirement is overdue
     */
    public function isOverdue(): bool
    {
        return $this->status === 'overdue' || 
            ($this->status === 'pending' && $this->due_date && $this->due_date < now());
    }

    /**
     * Check if the requirement is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Mark as completed
     */
    public function markAsCompleted(?string $notes = null, ?int $userId = null): self
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
            'completion_notes' => $notes,
            'completed_by_user_id' => $userId,
        ]);

        return $this;
    }

    /**
     * Mark as overdue
     */
    public function markAsOverdue(): self
    {
        $this->update(['status' => 'overdue']);
        return $this;
    }

    /**
     * Reset to pending
     */
    public function resetToPending(): self
    {
        $this->update([
            'status' => 'pending',
            'completed_at' => null,
            'completion_notes' => null,
            'completed_by_user_id' => null,
        ]);
        return $this;
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return [
            'pending' => 'Pending',
            'completed' => 'Completed',
            'overdue' => 'Overdue',
            'exempted' => 'Exempted',
        ][$this->status] ?? 'Unknown';
    }

    /**
     * Get status color
     */
    public function getStatusColorAttribute(): string
    {
        return [
            'pending' => 'yellow',
            'completed' => 'green',
            'overdue' => 'red',
            'exempted' => 'gray',
        ][$this->status] ?? 'gray';
    }

    /**
     * Get penalty formatted
     */
    public function getFormattedPenaltyAttribute(): string
    {
        return '₱' . number_format($this->penalty, 2);
    }

    /**
     * Get days until due date
     */
    public function getDaysUntilDueAttribute(): ?int
    {
        if (!$this->due_date) return null;
        return now()->diffInDays($this->due_date, false);
    }
}