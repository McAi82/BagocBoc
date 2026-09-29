<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Program extends Model
{
    use HasFactory;

    protected $table = 'programs';

    protected $fillable = [
        'programs',
        'description',
        'start_date',
        'end_date',
        'program_type',
        'status',
        'budget',
        'target_beneficiaries',
        'location',
        'implementing_agency',
        'focal_person_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'budget' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the participants
     */
    public function participants()
    {
        return $this->hasMany(ProgramParticipant::class);
    }

    /**
     * Get the focal person
     */
    public function focalPerson()
    {
        return $this->belongsTo(User::class, 'focal_person_id');
    }

    /**
     * Get program type label
     */
    public function getProgramTypeLabelAttribute()
    {
        $types = [
            'nutrition' => 'Nutrition',
            'drug' => 'Drug Prevention',
            'sexual_health' => 'Sexual Health',
            'maternal' => 'Maternal Health',
            'other' => 'Other',
        ];
        return $types[$this->program_type] ?? 'Other';
    }

    /**
     * Get program type color
     */
    public function getProgramTypeColorAttribute()
    {
        $colors = [
            'nutrition' => 'green',
            'drug' => 'red',
            'sexual_health' => 'pink',
            'maternal' => 'purple',
            'other' => 'gray',
        ];
        return $colors[$this->program_type] ?? 'gray';
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute()
    {
        $statuses = [
            'planned' => 'Planned',
            'ongoing' => 'Ongoing',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
        ];
        return $statuses[$this->status] ?? 'Unknown';
    }

    /**
     * Get status color
     */
    public function getStatusColorAttribute()
    {
        $colors = [
            'planned' => 'blue',
            'ongoing' => 'green',
            'completed' => 'gray',
            'cancelled' => 'red',
        ];
        return $colors[$this->status] ?? 'gray';
    }

    /**
     * Check if program is active
     */
    public function isActive()
    {
        return $this->status === 'ongoing';
    }

    /**
     * Check if program is completed
     */
    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    /**
     * Scope a query to only include active programs
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'ongoing');
    }

    /**
     * Scope a query to only include planned programs
     */
    public function scopePlanned($query)
    {
        return $query->where('status', 'planned');
    }

    /**
     * Scope a query to only include completed programs
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope a query by program type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('program_type', $type);
    }

    /**
     * Get participants count
     */
    public function getParticipantsCountAttribute()
    {
        return $this->participants()->count();
    }

    /**
     * Get active participants count
     */
    public function getActiveParticipantsCountAttribute()
    {
        return $this->participants()->where('status', 'active')->count();
    }
}