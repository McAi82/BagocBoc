<?php
// app/Models/Otp.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Otp extends Model
{
    use HasFactory;

    protected $table = 'otps_codes';

    protected $fillable = [
        'user_id',
        'email', 
        'code_hash',
        'purpose',
        'expires_at',
        'used_at',
        'attempts',
        'sent_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}