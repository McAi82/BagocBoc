<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FrontDeskRequest extends Model
{
    use HasFactory;

    protected $table = 'front_desk_requests';

    protected $fillable = [
        'resident_id',
        'service_type',
        'purpose',
        'priority',
        'reference_number',
        'status',
        'created_by_user_id',
        'processed_by_user_id',
        'processed_at',
        'issued_at',
        'forwarded_to_office',
        'forwarded_notes',
        'forwarded_by_user_id',
        'forwarded_at',
        'cancelled_at',
        'cancelled_by_user_id',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
        'issued_at' => 'datetime',
        'forwarded_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }

    public function queue()
    {
        return $this->hasOne(FrontDeskQueue::class);
    }

    public function claimSlip()
    {
        return $this->hasOne(FrontDeskClaimSlip::class);
    }

    public function appointments()
    {
        return $this->hasMany(FrontDeskAppointment::class);
    }
}