<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HouseholdEnvironment extends Model
{
    use HasFactory;

    public $timestamps = false;

     protected $fillable = [
        'household_census_id',
        'toilet_type',
        'water_source',
        'garbage_disposal',
        'tenure_status',
        'couple_practices_family_planning',
        'uses_iodized_salt',
        'OSY_count',
        'ISY_count',
        'type_of_dwelling_unit',
    ];

    protected $casts = [
        'couple_practices_family_planning' => 'boolean',
    ];

    public function censusRecord(): BelongsTo
    {
        return $this->belongsTo(HouseholdCensusRecord::class, 'household_census_id');
    }
}