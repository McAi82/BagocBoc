<?php
// app/Models/FinancialReport.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by_user_id',
        'approved_by_user_id',
        'title',
        'report_type',  // Now supports: collection, annual, certificate, tax, payment, clearance, resident_registry
        'period',
        'total_amount',
        'notes',
        'status',
        'submitted_at',
        'approved_at',
        'rejection_reason',
        'report_data',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'report_data' => 'array',
    ];

    // ✅ Report type constants
    const TYPES = [
        'collection' => 'Collection Report',
        'annual' => 'Annual Summary',
        'certificate' => 'Certificate Report',
        'tax' => 'Tax Collection Report',
        'payment' => 'Payment Summary',
        'clearance' => 'Clearance Report',
        'resident_registry' => 'Resident Registry',
    ];

    // ✅ Report type labels
    public function getReportTypeLabelAttribute(): string
    {
        return self::TYPES[$this->report_type] ?? ucfirst($this->report_type);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    // ✅ Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeByType($query, $type)
    {
        return $query->where('report_type', $type);
    }

    // ✅ Status helpers
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    public function canApprove(): bool
    {
        return $this->status === 'pending';
    }

    // ✅ Status color
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            'approved' => 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'rejected' => 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            default => 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        };
    }

    // ✅ Status label
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pending',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            default => ucfirst($this->status ?? 'Unknown'),
        };
    }
}
