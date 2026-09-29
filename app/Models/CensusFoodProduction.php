<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class CensusFoodProduction extends Pivot
{
    protected $table = 'census_food_productions';

    protected $fillable = [
        'household_census_record_id',
        'food_production_type_id',
    ];
}