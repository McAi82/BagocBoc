<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CheckupRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_record_id',
        'resident_id',
        'performed_by_user_id',
        'checkup_type',
        'checkup_date',
        'vital_signs',
        'assessment',
        'diagnosis',
        'treatment',
        'recommendations',
        'follow_up_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'vital_signs' => 'array',
        'checkup_date' => 'datetime',
        'follow_up_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function patientRecord()
    {
        return $this->belongsTo(PatientRecord::class);
    }

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by_user_id');
    }

    // Type-specific checkup relationships
    public function pregnancyCheckup()
    {
        return $this->hasOne(PregnancyCheckup::class);
    }

    public function childCheckup()
    {
        return $this->hasOne(ChildCheckup::class);
    }

    public function lactatingCheckup()
    {
        return $this->hasOne(LactatingCheckup::class);
    }

    public function seniorCheckup()
    {
        return $this->hasOne(SeniorCheckup::class);
    }

    public function ncdCheckup()
    {
        return $this->hasOne(NcdCheckup::class);
    }

    public function getSpecificCheckup()
    {
        switch ($this->checkup_type) {
            case 'pregnancy':
                return $this->pregnancyCheckup;
            case 'child':
                return $this->childCheckup;
            case 'lactating':
                return $this->lactatingCheckup;
            case 'senior':
                return $this->seniorCheckup;
            case 'ncd':
                return $this->ncdCheckup;
            default:
                return null;
        }
    }

    public function getCheckupTypeLabelAttribute()
    {
        return [
            'pregnancy' => 'Pregnancy Check-up',
            'child' => 'Child Check-up/Vaccination',
            'lactating' => 'Lactation Check-up/Counseling',
            'senior' => 'Senior Health Review',
            'ncd' => 'NCD Monitoring',
        ][$this->checkup_type] ?? $this->checkup_type;
    }
}