<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PregnancyRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_record_id',
        'resident_id',
        'last_menstrual_period',
        'expected_delivery_date',
        'gestational_age',
        'gravida',
        'para',
        'obstetric_history',
        'risk_level',
        'immunization_status',
        'prenatal_logs',
        'allergies',
        'medical_history',
        'current_medications',
    ];

    protected $casts = [
        'last_menstrual_period' => 'date',
        'expected_delivery_date' => 'date',
        'gestational_age' => 'integer',
        'gravida' => 'integer',
        'para' => 'integer',
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
        return $this->hasMany(PregnancyCheckup::class);
    }
}