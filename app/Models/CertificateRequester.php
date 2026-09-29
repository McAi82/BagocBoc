<?php
// app/Models/CertificateRequester.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CertificateRequester extends Model
{
    use HasFactory;

    protected $table = 'certificate_requesters';

    protected $fillable = [
        'resident_id',
        'photo_id',
    ];

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function certifications(): HasMany
    {
        return $this->hasMany(Certification::class, 'requester_id');
    }
}