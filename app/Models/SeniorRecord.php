<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SeniorRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_record_id',
        'resident_id',
        'falls_risk_score',
        'cognitive_assessment',
        'memory_status',
        'chronic_conditions',
        'medication_list',
        'allergies',
        'activity_level',
        'support_system',
        'emergency_contact',
    ];

    protected $casts = [
        'falls_risk_score' => 'integer',
    ];

    public function patientRecord()
    {
        return $this->belongsTo(PatientRecord::class);
    }

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function checkups()
    {
        return $this->hasMany(SeniorCheckup::class);
    }
}