<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TaxPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'processed_by_user_id',
        'receipt_number',
        'taxpayer_name',
        'tax_type',
        'amount',
        'payment_method',
        'status',
        'paid_at',
        'remarks',
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
}