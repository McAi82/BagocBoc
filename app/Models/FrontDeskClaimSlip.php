<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FrontDeskClaimSlip extends Model
{
    use HasFactory;

    protected $table = 'front_desk_claim_slips';

    protected $fillable = [
        'request_id',
        'resident_id',
        'reference_number',
        'document_type',
        'status',
        'issued_by_user_id',
        'issued_at',
        'claimed_at',
        'claimed_by_user_id',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'claimed_at' => 'datetime',
    ];

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function request()
    {
        return $this->belongsTo(FrontDeskRequest::class);
    }

    public function issuedBy()
    {
        return $this->belongsTo(User::class, 'issued_by_user_id');
    }

    public function claimedBy()
    {
        return $this->belongsTo(User::class, 'claimed_by_user_id');
    }
}