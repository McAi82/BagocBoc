<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ResidentConfirmation extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'requested_by_user_id',
        'zone_leader_id',
        'status',
        'notes',
        'confirmed_at',
        'rejected_at',
        'rejection_reason',
    ];

    protected $casts = [
        'confirmed_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    /**
     * ✅ Automatically eager-load these relations on every query,
     * so JSON responses always include the nested resident data.
     */
    protected $with = [
        'requestedBy.resident',
        'zoneLeader.resident',
    ];

    /**
     * ✅ Append computed display names to every JSON response.
     */
    protected $appends = [
        'requested_by_name',
        'zone_leader_name',
    ];

    // ============================================
    // RELATIONSHIPS
    // ============================================

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function zoneLeader()
    {
        return $this->belongsTo(User::class, 'zone_leader_id');
    }

    // ============================================
    // ACCESSORS
    // ============================================

    /**
     * Human-readable name for the "Requested By" column.
     * Prefers the linked resident's full name; falls back to email.
     */
    public function getRequestedByNameAttribute(): ?string
    {
        $user = $this->requestedBy;
        if (!$user) return null;

        $resident = $user->resident;
        if ($resident) {
            $name = trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''));
            if ($name !== '') return $name;
        }

        return $user->email;
    }

    /**
     * Human-readable name for the "Zone Leader" column.
     * Prefers the linked resident's full name; falls back to email.
     */
    public function getZoneLeaderNameAttribute(): ?string
    {
        $user = $this->zoneLeader;
        if (!$user) return null;

        $resident = $user->resident;
        if ($resident) {
            $name = trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''));
            if ($name !== '') return $name;
        }

        return $user->email;
    }
}
