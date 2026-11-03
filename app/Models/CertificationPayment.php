<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CertificationPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'certification_id',
        'amount',
        'payment_method',
        'reference_number',
        'official_receipt_number',
        'status',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function certification()
    {
        return $this->belongsTo(Certification::class);
    }
}