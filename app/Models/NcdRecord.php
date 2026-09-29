<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class NcdRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_record_id',
        'resident_id',
        'ncd_classification',
        'diagnosis_date',
        'lab_results',
        'medications',
        'complications',
        'lifestyle_factors',
        'allergies',
        'treatment_history',
        'current_status',
    ];

    protected $casts = [
        'diagnosis_date' => 'date',
        'lab_results' => 'array',
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
        return $this->hasMany(NcdCheckup::class);
    }
}