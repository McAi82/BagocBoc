<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'processed_by_user_id',
        'or_number',
        'amount',
        'payment_type',
        'payment_method',
        'description',
        'status',
        'paid_at',
        'payable_id',
        'payable_type',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }

    public function payable()
    {
        return $this->morphTo();
    }
}