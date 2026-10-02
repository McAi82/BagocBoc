<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Certification extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'requester_id',
        'certification_type_id',
        'requested_by_user_id',
        'processed_by_user_id',
        'reference_number',
        'purpose',
        'details',
        'file_url',
        'document_path',
        'document_name',
        'pdf_url',
        'downloaded_at',
        'download_token',
        'download_token_expires_at',
        'status',
        'issued_at',
        'expiry_date',
        'remarks',
        'approved_at',
        'released_at',
        'received_at',
        'zl_clearance_status',
        'zl_clearance_notes',
        'zl_clearance_date',
        'submission_channel',
        'virtual_documents',
        'payment_method',
        'payment_status',
        'payment_reference',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'expiry_date' => 'date',
        'approved_at' => 'datetime',
        'released_at' => 'datetime',
        'received_at' => 'datetime',
        'zl_clearance_date' => 'datetime',
        'virtual_documents' => 'array',
        'downloaded_at' => 'datetime',
        'download_token_expires_at' => 'datetime',
    ];

    protected $appends = ['pdf_download_url', 'is_downloadable', 'has_been_downloaded'];

    // ============================================
    // RELATIONSHIPS
    // ============================================

    public function requester(): BelongsTo
    {
        return $this->belongsTo(CertificateRequester::class, 'requester_id');
    }

    public function resident()
    {
        return $this->hasOneThrough(
            Resident::class,
            CertificateRequester::class,
            'id',
            'id',
            'requester_id',
            'resident_id'
        );
    }

    public function certificationType(): BelongsTo
    {
        return $this->belongsTo(CertificationType::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }

    // ============================================
    // ACCESSORS
    // ============================================

    public function getIsDownloadableAttribute(): bool
    {
        if (!$this->document_path) return false;
        if ($this->downloaded_at) return false;
        if ($this->download_token_expires_at && $this->download_token_expires_at->isPast()) {
            return false;
        }
        return true;
    }

    public function getHasBeenDownloadedAttribute(): bool
    {
        return $this->downloaded_at !== null;
    }

    public function getPdfDownloadUrlAttribute(): ?string
    {
        if (!$this->is_downloadable || !$this->download_token) {
            return null;
        }
        return url('/api/mobile/certificates/download/' . $this->download_token);
    }

    public function generateDownloadToken(int $expiresInHours = 72): void
    {
        $this->update([
            'download_token' => bin2hex(random_bytes(32)),
            'download_token_expires_at' => now()->addHours($expiresInHours),
            'downloaded_at' => null,
        ]);
    }

    public function markAsDownloaded(): void
    {
        $this->update([
            'downloaded_at' => now(),
            'download_token' => null,
            'download_token_expires_at' => null,
        ]);
    }

    public function getResidentAttribute()
    {
        return $this->resident()->first();
    }

    public function getResidentNameAttribute()
    {
        $resident = $this->resident()->first();
        return $resident ? $resident->full_name : 'Unknown';
    }

    // ============================================
    // ZL CLEARANCE HELPERS
    // ============================================

    /**
     * True only when the Zone Leader has NOT yet reviewed this request.
     * Any status other than Pending, or any existing zl_clearance_status,
     * locks the ZL out of the first-pass actions.
     */
    public function canZoneLeaderClear(): bool
    {
        return $this->status === 'Pending'
            && empty($this->zl_clearance_status);
    }

    public function isZlCleared(): bool
    {
        return $this->zl_clearance_status === 'cleared';
    }

    public function isZlFlagged(): bool
    {
        return $this->zl_clearance_status === 'flagged';
    }

    /**
     * The Secretary can approve Pending (direct override) or
     * In Review (standard two-stage flow).
     */
    public function canSecretaryApprove(): bool
    {
        return in_array($this->status, ['Pending', 'In Review']);
    }

    // ============================================
    // GENERAL STATUS HELPERS
    // ============================================

    public function canApprove(): bool
    {
        return in_array($this->status, ['Pending', 'In Review']);
    }

    public function canCreateDocument(): bool
    {
        return $this->status === 'Approved';
    }

    public function canRelease(): bool
    {
        return $this->status === 'Ready for Release' && $this->document_path;
    }

    public function canReceive(): bool
    {
        return $this->status === 'Released';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'Released' && $this->received_at !== null;
    }

    // ============================================
    // SCOPES
    // ============================================

    public function scopePending($query)
    {
        return $query->whereIn('status', ['Pending', 'In Review']);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'Approved');
    }

    public function scopeReadyForRelease($query)
    {
        return $query->where('status', 'Ready for Release');
    }

    public function scopeReleased($query)
    {
        return $query->where('status', 'Released');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'Rejected');
    }
}
