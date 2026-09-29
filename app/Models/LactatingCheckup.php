<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LactatingCheckup extends Model
{
    protected $fillable = [
        'checkup_record_id',
        'feeding_method',
        'latching_assessment',
        'nutritional_counseling',
        'infant_weight',
        'family_planning_counseling',
    ];

    public function checkupRecord()
    {
        return $this->belongsTo(CheckupRecord::class);
    }
}