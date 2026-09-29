<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ChildRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_record_id',
        'resident_id',
        'birth_weight',
        'birth_height',
        'birth_head_circumference',
        'gestational_age_at_birth',
        'birth_type',
        'birth_complications',
        'immunization_history',
        'allergies',
        'chronic_conditions',
    ];

    protected $casts = [
        'birth_weight' => 'decimal:2',
        'birth_height' => 'decimal:2',
        'birth_head_circumference' => 'decimal:2',
        'gestational_age_at_birth' => 'integer',
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
        return $this->hasMany(ChildCheckup::class);
    }
}