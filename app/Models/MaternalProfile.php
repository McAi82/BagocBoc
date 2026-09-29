<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MaternalProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'pregnancy_status',
        'expected_delivery_date',
        'last_checkup_date',
        'family_planning',
        'remarks',
    ];

    protected $casts = [
        'expected_delivery_date' => 'date',
        'last_checkup_date' => 'date',
        'family_planning' => 'boolean',
    ];

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }
}