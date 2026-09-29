<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PatientRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'patient_type',
        'created_by_user_id',
        'updated_by_user_id',
        'status',
        'vital_signs',
    ];

    protected $casts = [
        'vital_signs' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    // Type-specific record relationships
    public function pregnancyRecord()
    {
        return $this->hasOne(PregnancyRecord::class);
    }

    public function childRecord()
    {
        return $this->hasOne(ChildRecord::class);
    }

    public function lactatingRecord()
    {
        return $this->hasOne(LactatingRecord::class);
    }

    public function seniorRecord()
    {
        return $this->hasOne(SeniorRecord::class);
    }

    public function ncdRecord()
    {
        return $this->hasOne(NcdRecord::class);
    }

    public function checkups()
    {
        return $this->hasMany(CheckupRecord::class);
    }

    public function getSpecificRecord()
    {
        switch ($this->patient_type) {
            case 'pregnant':
                return $this->pregnancyRecord;
            case 'child':
                return $this->childRecord;
            case 'lactating':
                return $this->lactatingRecord;
            case 'senior':
                return $this->seniorRecord;
            case 'ncd':
                return $this->ncdRecord;
            default:
                return null;
        }
    }

    public function getPatientTypeLabelAttribute()
    {
        return [
            'pregnant' => 'Pregnant',
            'child' => 'Child',
            'lactating' => 'Lactating',
            'senior' => 'Senior Citizen',
            'ncd' => 'NCD/Chronic',
        ][$this->patient_type] ?? $this->patient_type;
    }

    public function getStatusLabelAttribute()
    {
        return [
            'active' => 'Active',
            'inactive' => 'Inactive',
            'archived' => 'Archived',
        ][$this->status] ?? $this->status;
    }
}