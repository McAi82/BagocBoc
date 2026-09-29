<?php
// app/Models/HouseGeotag.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class HouseGeotag extends Model
{
    use HasFactory;

    protected $fillable = [
        'household_id',
        'latitude',
        'longitude',
        'captured_at',
        'qr_code',           // ✅ Add these
        'qr_data',           // ✅ Add these
        'qr_generated_at',   // ✅ Add these
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'captured_at' => 'datetime',
        'qr_generated_at' => 'datetime',
    ];

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    // ✅ Helper to check if QR code exists
    public function hasQRCode(): bool
    {
        return $this->qr_code !== null && $this->qr_code !== '';
    }

    // ✅ Get QR data as array
    public function getQRDataArray(): ?array
    {
        if (!$this->qr_data) return null;
        return json_decode($this->qr_data, true);
    }
}