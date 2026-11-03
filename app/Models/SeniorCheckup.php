<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeniorCheckup extends Model
{
    protected $fillable = [
        'checkup_record_id',
        'vitals',
        'blood_sugar',
        'falls_reassessment',
        'cognitive_check',
        'medication_adherence',
    ];

    protected $casts = [
        'vitals' => 'array',
    ];

    public function checkupRecord()
    {
        return $this->belongsTo(CheckupRecord::class);
    }
}