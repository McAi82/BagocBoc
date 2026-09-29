<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class OptPlusAssessment extends Model
{
    use HasFactory;

    protected $table = 'opt_plus_assessments';

    protected $fillable = [
        'assessment_date',
        'resident_id',
        'weight_kg',
        'height_cm',
        'remarks',
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'weight_kg' => 'decimal:2',
        'height_cm' => 'decimal:2',
    ];

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }
}