<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FrontDeskQueue extends Model
{
    use HasFactory;

    protected $table = 'front_desk_queue';

    protected $fillable = [
        'resident_id',
        'request_id',
        'service_type', // ✅ NEW
        'position',
        'status',
        'joined_at',
        'called_at',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
        'called_at' => 'datetime',
    ];

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function request()
    {
        return $this->belongsTo(FrontDeskRequest::class);
    }
}