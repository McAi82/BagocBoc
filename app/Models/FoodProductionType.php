<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FoodProductionType extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'name'
    ];

    public function censusRecords()
    {
        return $this->belongsToMany(HouseholdCensusRecord::class, 'census_food_productions');
    }
}