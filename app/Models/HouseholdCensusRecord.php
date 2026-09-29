<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class HouseholdCensusRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'household_id',
        'census_year',
        'census_date',
        'monthly_income',
        'encoded_by',
        'data_status',
    ];

    protected $casts = [
        'census_date' => 'date',
        'monthly_income' => 'decimal:2',
    ];

    // ✅ Both methods point to same relationship
    public function environment()
    {
        return $this->hasOne(HouseholdEnvironment::class, 'household_census_id');
    }

    public function householdEnvironment()
    {
        return $this->hasOne(HouseholdEnvironment::class, 'household_census_id');
    }

    public function geotag()
    {
        return $this->hasOne(HouseGeotag::class, 'household_id', 'household_id');
    }

    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    public function encoder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'encoded_by');
    }

    public function foodProductionTypes(): BelongsToMany
    {
        return $this->belongsToMany(FoodProductionType::class, 'census_food_productions', 'household_census_record_id', 'food_production_type_id');
    }

    /**
     * Get the status label
     */
    public function getStatusLabelAttribute()
    {
        $statuses = [
            'Saved' => 'Saved',
            'Pending' => 'Pending',
            'Approved' => 'Approved',
            'Rejected' => 'Rejected',
        ];
        return $statuses[$this->data_status] ?? 'Unknown';
    }

    /**
     * Get the status color
     */
    public function getStatusColorAttribute()
    {
        $colors = [
            'Saved' => 'gray',
            'Pending' => 'yellow',
            'Approved' => 'green',
            'Rejected' => 'red',
        ];
        return $colors[$this->data_status] ?? 'gray';
    }

    /**
     * Scope a query to only include pending records
     */
    public function scopePending($query)
    {
        return $query->where('data_status', 'Pending');
    }

    /**
     * Scope a query to only include approved records
     */
    public function scopeApproved($query)
    {
        return $query->where('data_status', 'Approved');
    }

    /**
     * Scope a query to only include records by encoder
     */
    public function scopeByEncoder($query, $userId)
    {
        return $query->where('encoded_by', $userId);
    }
}