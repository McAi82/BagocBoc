<?php
// app/Models/HouseholdAddress.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HouseholdAddress extends Model
{
    use HasFactory;

    protected $fillable = [
        'zone',
        'street',
    ];

    public function barangayZone(): BelongsTo
    {
        return $this->belongsTo(BarangayZone::class, 'zone');
    }

    public function households(): HasMany
    {
        return $this->hasMany(Household::class, 'address_id');
    }
}