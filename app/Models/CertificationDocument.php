<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CertificationDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'certification_id',
        'document_type_id',
        'uploaded_by_user_id',
        'verification_status',
        'verified_by_user_id',
        'verified_at',
        'remarks',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
    ];

    public function certification()
    {
        return $this->belongsTo(Certification::class);
    }

    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }
}