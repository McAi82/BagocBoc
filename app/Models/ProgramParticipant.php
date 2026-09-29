<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProgramParticipant extends Model
{
    use HasFactory;

    protected $table = 'program_participants';

    protected $fillable = [
        'program_id',
        'resident_id',
        'enrolled_at',
        'status',
        'notes',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the program
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Get the resident
     */
    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    /**
     * Get the nutrition assessments
     */
    public function nutritionAssessments()
    {
        return $this->hasMany(NutritionAssessment::class, 'participant_id');
    }

    /**
     * Get latest nutrition assessment
     */
    public function latestAssessment()
    {
        return $this->hasOne(NutritionAssessment::class, 'participant_id')
                    ->latest('assessment_date');
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute()
    {
        $statuses = [
            'active' => 'Active',
            'inactive' => 'Inactive',
            'completed' => 'Completed',
            'dropped' => 'Dropped',
        ];
        return $statuses[$this->status] ?? 'Unknown';
    }

    /**
     * Get status color
     */
    public function getStatusColorAttribute()
    {
        $colors = [
            'active' => 'green',
            'inactive' => 'gray',
            'completed' => 'blue',
            'dropped' => 'red',
        ];
        return $colors[$this->status] ?? 'gray';
    }

    /**
     * Check if participant is active
     */
    public function isActive()
    {
        return $this->status === 'active';
    }

    /**
     * Scope a query to only include active participants
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query by program
     */
    public function scopeByProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }

    /**
     * Get full name of participant
     */
    public function getFullNameAttribute()
    {
        return $this->resident ? $this->resident->full_name : 'Unknown';
    }

    /**
     * Get assessment count
     */
    public function getAssessmentCountAttribute()
    {
        return $this->nutritionAssessments()->count();
    }
}