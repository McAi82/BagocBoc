<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FrontDeskAppointment extends Model
{
    use HasFactory;

    protected $table = 'front_desk_appointments';

    protected $fillable = [
        'resident_id',
        'request_id',
        'service_type',
        'appointment_date',
        'appointment_time',
        'notes',
        'reference_number',
        'status',
        'created_by_user_id',
        'cancelled_at',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'cancelled_at' => 'datetime',
    ];

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function request()
    {
        return $this->belongsTo(FrontDeskRequest::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}