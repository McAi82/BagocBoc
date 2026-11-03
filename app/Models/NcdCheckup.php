<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NcdCheckup extends Model
{
    protected $fillable = [
        'checkup_record_id',
        'vitals',
        'lab_results',
        'medication_adherence',
        'lifestyle_counseling',
        'complication_monitoring',
    ];

    protected $casts = [
        'vitals' => 'array',
        'lab_results' => 'array',
    ];

    public function checkupRecord()
    {
        return $this->belongsTo(CheckupRecord::class);
    }
}