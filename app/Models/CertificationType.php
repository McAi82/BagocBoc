<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CertificationType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'fee',
        'is_active',
    ];

    protected $casts = [
        'fee' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function certifications()
    {
        return $this->hasMany(Certification::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}