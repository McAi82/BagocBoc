<?php
// app/Models/CertificatePayment.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CertificatePayment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'certification_id',
        'amount',
        'payment_method',
        'reference_number',
        'official_receipt_number',
        'status',
        'paid_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    /**
     * Get the certification that owns the payment.
     */
    public function certification(): BelongsTo
    {
        return $this->belongsTo(Certification::class);
    }

    /**
     * Scope a query to only include paid payments.
     */
    public function scopePaid($query)
    {
        return $query->where('status', 'Paid');
    }

    /**
     * Scope a query to only include pending payments.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'Pending');
    }

    /**
     * Scope a query to only include failed payments.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'Failed');
    }

    /**
     * Scope a query to only include refunded payments.
     */
    public function scopeRefunded($query)
    {
        return $query->where('status', 'Refunded');
    }

    /**
     * Check if payment is paid.
     */
    public function isPaid(): bool
    {
        return $this->status === 'Paid';
    }

    /**
     * Check if payment is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'Pending';
    }

    /**
     * Check if payment is failed.
     */
    public function isFailed(): bool
    {
        return $this->status === 'Failed';
    }

    /**
     * Check if payment is refunded.
     */
    public function isRefunded(): bool
    {
        return $this->status === 'Refunded';
    }

    /**
     * Mark payment as paid.
     */
    public function markAsPaid(): self
    {
        $this->update([
            'status' => 'Paid',
            'paid_at' => now(),
        ]);

        return $this;
    }

    /**
     * Mark payment as failed.
     */
    public function markAsFailed(): self
    {
        $this->update([
            'status' => 'Failed',
        ]);

        return $this;
    }

    /**
     * Mark payment as refunded.
     */
    public function markAsRefunded(): self
    {
        $this->update([
            'status' => 'Refunded',
        ]);

        return $this;
    }

    /**
     * Get the payment amount formatted.
     */
    public function getFormattedAmountAttribute(): string
    {
        return '₱' . number_format($this->amount, 2);
    }

    /**
     * Get the payment date formatted.
     */
    public function getFormattedPaidAtAttribute(): string
    {
        return $this->paid_at ? $this->paid_at->format('F d, Y h:i A') : 'N/A';
    }

    /**
     * Get the status badge color.
     */
    public function getStatusBadgeColorAttribute(): string
    {
        return match ($this->status) {
            'Paid' => 'green',
            'Pending' => 'yellow',
            'Failed' => 'red',
            'Refunded' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Get the status label.
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'Paid' => 'Paid',
            'Pending' => 'Pending',
            'Failed' => 'Failed',
            'Refunded' => 'Refunded',
            default => ucfirst($this->status ?? 'Unknown'),
        };
    }
}