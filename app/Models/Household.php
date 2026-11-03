<?php
// app/Models/Household.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Household extends Model
{
    use HasFactory;

    protected $fillable = [
        'address_id',
        'household_number',
        'household_tracking_number',
        'status',
    ];

    // ✅ Set default status
    protected $attributes = [
        'status' => 'active',
    ];

    public function address(): BelongsTo
    {
        return $this->belongsTo(HouseholdAddress::class, 'address_id');
    }

    public function residents(): BelongsToMany
    {
        return $this->belongsToMany(Resident::class, 'resident_households')
            ->withPivot('relationship_to_household', 'is_primary', 'start_date', 'end_date', 'status')
            ->withTimestamps()
            ->wherePivot('status', 'active');
    }

    public function censusRecords(): HasMany
    {
        return $this->hasMany(HouseholdCensusRecord::class);
    }

    public function latestCensus(): HasOne
    {
        return $this->hasOne(HouseholdCensusRecord::class)->latest();
    }

    public function geotag(): HasOne
    {
        return $this->hasOne(HouseGeotag::class);
    }
}