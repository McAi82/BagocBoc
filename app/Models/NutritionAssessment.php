<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class NutritionAssessment extends Model
{
    use HasFactory;

    protected $table = 'nutrition_assessments';

    protected $fillable = [
        'participant_id',
        'assessment_date',
        'weight',
        'height',
        'bmi',
        'nutrition_status',
        'weight_for_age_status',
        'height_for_age_status',
        'weight_for_height_status',
        'remarks',
        'encoded_by',
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'weight' => 'decimal:2',
        'height' => 'decimal:2',
        'bmi' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the participant
     */
    public function participant()
    {
        return $this->belongsTo(ProgramParticipant::class, 'participant_id');
    }

    /**
     * Get the encoder
     */
    public function encodedBy()
    {
        return $this->belongsTo(User::class, 'encoded_by');
    }

    /**
     * Get the resident through participant
     */
    public function resident()
    {
        return $this->hasOneThrough(
            Resident::class,
            ProgramParticipant::class,
            'id', // Foreign key on ProgramParticipant
            'id', // Foreign key on Resident
            'participant_id', // Local key on NutritionAssessment
            'resident_id' // Local key on ProgramParticipant
        );
    }

    /**
     * Calculate BMI
     */
    public static function calculateBmi($weight, $height)
    {
        if ($weight <= 0 || $height <= 0) {
            return null;
        }
        $heightInMeters = $height / 100;
        return round($weight / ($heightInMeters * $heightInMeters), 2);
    }

    /**
     * Get nutrition status label
     */
    public function getNutritionStatusLabelAttribute()
    {
        $statuses = [
            'normal' => 'Normal',
            'underweight' => 'Underweight',
            'overweight' => 'Overweight',
            'obese' => 'Obese',
            'severely_underweight' => 'Severely Underweight',
            'severely_obese' => 'Severely Obese',
        ];
        return $statuses[$this->nutrition_status] ?? 'Unknown';
    }

    /**
     * Get nutrition status color
     */
    public function getNutritionStatusColorAttribute()
    {
        $colors = [
            'normal' => 'green',
            'underweight' => 'yellow',
            'overweight' => 'orange',
            'obese' => 'red',
            'severely_underweight' => 'red',
            'severely_obese' => 'red',
        ];
        return $colors[$this->nutrition_status] ?? 'gray';
    }

    /**
     * Get weight for age status label
     */
    public function getWeightForAgeLabelAttribute()
    {
        $statuses = [
            'normal' => 'Normal',
            'underweight' => 'Underweight',
            'overweight' => 'Overweight',
            'obese' => 'Obese',
            'severely_underweight' => 'Severely Underweight',
        ];
        return $statuses[$this->weight_for_age_status] ?? 'Unknown';
    }

    /**
     * Get height for age status label
     */
    public function getHeightForAgeLabelAttribute()
    {
        $statuses = [
            'normal' => 'Normal',
            'stunted' => 'Stunted',
            'severely_stunted' => 'Severely Stunted',
            'tall' => 'Tall',
        ];
        return $statuses[$this->height_for_age_status] ?? 'Unknown';
    }

    /**
     * Get weight for height status label
     */
    public function getWeightForHeightLabelAttribute()
    {
        $statuses = [
            'normal' => 'Normal',
            'wasted' => 'Wasted',
            'severely_wasted' => 'Severely Wasted',
            'overweight' => 'Overweight',
            'obese' => 'Obese',
        ];
        return $statuses[$this->weight_for_height_status] ?? 'Unknown';
    }
}