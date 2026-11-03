<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ZoneCheckIn extends Model
{
    use HasFactory;

    protected $fillable = [
        'zone_leader_id',
        'zone_id',
        'latitude',
        'longitude',
        'notes',
        'status',
        'checked_in_at',
        'findings',
        'attachments',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'checked_in_at' => 'datetime',
        'attachments' => 'array',
    ];

    public function zoneLeader()
    {
        return $this->belongsTo(User::class, 'zone_leader_id');
    }

    public function zone()
    {
        return $this->belongsTo(BarangayZone::class);
    }
}