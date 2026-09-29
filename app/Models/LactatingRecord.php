<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class LactatingRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_record_id',
        'resident_id',
        'breastfeeding_status',
        'infant_age',
        'feeding_method',
        'latching_assessment',
        'nutritional_status',
        'family_planning_method',
        'maternal_health_status',
        'infant_weight',
        'infant_health_status',
    ];

    protected $casts = [
        'infant_age' => 'integer',
        'infant_weight' => 'decimal:2',
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
        return $this->hasMany(LactatingCheckup::class);
    }
}