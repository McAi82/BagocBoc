<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PregnancyCheckup extends Model
{
    protected $fillable = [
        'checkup_record_id',
        'maternal_vitals',
        'fetal_assessment',
        'interventions',
        'micronutrients',
        'clinical_assessment',
    ];

    protected $casts = [
        'maternal_vitals' => 'array',
    ];

    public function checkupRecord()
    {
        return $this->belongsTo(CheckupRecord::class);
    }
}