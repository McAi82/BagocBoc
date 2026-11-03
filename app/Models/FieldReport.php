<?php
// app/Models/FieldReport.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'submitted_by_user_id',
        'reviewed_by_user_id',
        'report_type',
        'sub_report_type',  // Specific type within category
        'title',
        'content',
        'status',
        'rejection_reason',
        'notes',
        'submitted_at',
        'reviewed_at',
        'metadata',  // JSON field for additional data
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'metadata' => 'array',
    ];

    // Report types
    const TYPES = [
        'financial' => 'Financial Report',
        'certificate' => 'Certificate Report',
        'clearance' => 'Clearance Report',
        'field' => 'Field Report',
        'zone' => 'Zone Report',
        'demographic' => 'Demographic Report',
        'health' => 'Health Report',
        'compliance' => 'Compliance Report',
        'resident_registry' => 'Resident Registry',
    ];

    // Sub-types for each report type
    const SUB_TYPES = [
        'financial' => [
            'collection' => 'Collection Report',
            'budget' => 'Budget Utilization',
            'annual' => 'Annual Summary',
            'tax' => 'Tax Collection',
            'payment' => 'Payment Summary',
        ],
        'certificate' => [
            'residency' => 'Certificate of Residency',
            'indigency' => 'Certificate of Indigency',
            'good_moral' => 'Certificate of Good Moral',
            'clearance' => 'Barangay Clearance',
        ],
        'clearance' => [
            'barangay' => 'Barangay Clearance',
            'business' => 'Business Clearance',
        ],
        'field' => [
            'health' => 'Health Report',
            'incident' => 'Incident Report',
            'general' => 'General Field Report',
        ],
        'zone' => [
            'check_in' => 'Zone Check-in',
            'compliance' => 'Zone Compliance',
            'survey' => 'Zone Survey',
        ],
        'demographic' => [
            'household' => 'Household Consolidation',
            'family' => 'Family Consolidation',
            'gender' => 'Gender Distribution',
            'age' => 'Age Distribution',
            'pregnant' => 'Pregnant Women',
            'breastfeeding' => 'Breastfeeding Mothers',
        ],
    ];

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

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

    public function canApprove(): bool
    {
        return $this->status === 'pending';
    }

    public function getStatusLabelAttribute(): string
    {
        return [
            'pending' => 'Pending',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
        ][$this->status] ?? 'Unknown';
    }

    public function getStatusColorAttribute(): string
    {
        return [
            'pending' => 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            'approved' => 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'rejected' => 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        ][$this->status] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }

    public function getReportTypeLabelAttribute(): string
    {
        return self::TYPES[$this->report_type] ?? $this->report_type;
    }

    public function getSubReportTypeLabelAttribute(): string
    {
        $subTypes = self::SUB_TYPES[$this->report_type] ?? [];
        return $subTypes[$this->sub_report_type] ?? $this->sub_report_type ?? 'N/A';
    }

    public function getSubmitterNameAttribute(): string
    {
        $resident = $this->submittedBy?->resident;
        if ($resident) {
            return $resident->full_name;
        }
        return $this->submittedBy?->email ?? 'Unknown';
    }

    public function getSubmitterRoleAttribute(): string
    {
        $user = $this->submittedBy;
        if (!$user) return 'Unknown';

        $role = $user->roles()->first();
        return $role?->name ?? 'Unknown';
    }
}
