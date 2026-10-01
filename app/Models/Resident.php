<?php
// app/Models/Resident.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Resident extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'phone_number',
        'email',
        'gender',
        'citizenship',
        'birth_date',
        'place_of_birth',
        'civil_status',
        'voter_status',
        'occupation',
        'monthly_income',
        'education_attainment',
        'relationship_to_head',
        'PSC_with_disability',
        'status'
    ];

    protected $casts = [
        'birth_date' => 'date',
        'monthly_income' => 'decimal:2',
        'PSC_with_disability' => 'boolean',
    ];

    protected $appends = ['age', 'full_name'];

    public function certifications()
    {
        return $this->hasMany(Certification::class);
    }

    public function clearances()
    {
        return $this->hasMany(Clearance::class);
    }
    public function patientRecords()
    {
        return $this->hasMany(\App\Models\PatientRecord::class, 'resident_id');
    }
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function taxPayments()
    {
        return $this->hasMany(TaxPayment::class);
    }

    public function penalties()
    {
        return $this->hasMany(Penalty::class);
    }

    public function optPlusAssessments()
    {
        return $this->hasMany(OptPlusAssessment::class);
    }

    public function maternalProfiles()
    {
        return $this->hasMany(MaternalProfile::class);
    }

    public function maternalProfile()
    {
        return $this->hasOne(MaternalProfile::class);
    }

    public function user()
    {
        return $this->hasOne(User::class);
    }

    public function households(): BelongsToMany
    {
        return $this->belongsToMany(Household::class, 'resident_households')
            ->withPivot('relationship_to_household', 'is_primary', 'start_date', 'end_date', 'status')
            ->withTimestamps()
            ->wherePivot('status', 'active');
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->first_name . ' ' . ($this->middle_name ? $this->middle_name . ' ' : '') . $this->last_name);
    }

    public function getAgeAttribute(): ?int
    {
        if ($this->birth_date) {
            try {
                $birthDate = \Carbon\Carbon::parse($this->birth_date);

                if ($birthDate->isFuture()) {
                    return 0;
                }

                $age = $birthDate->diffInYears(now());
                return max(0, $age);
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }

    public function getAgeInMonthsAttribute(): ?int
    {
        if ($this->birth_date) {
            try {
                $birthDate = \Carbon\Carbon::parse($this->birth_date);

                if ($birthDate->isFuture()) {
                    return 0;
                }

                $months = $birthDate->diffInMonths(now());
                return max(0, $months);
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }

    public function getAgeGroupAttribute(): string
    {
        $age = $this->age;
        if ($age === null) return 'Unknown';

        if ($age <= 12) return '0-12';
        if ($age <= 18) return '13-18';
        if ($age <= 35) return '19-35';
        if ($age <= 60) return '36-60';
        return '60+';
    }
}
