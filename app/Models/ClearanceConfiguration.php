<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ClearanceConfiguration extends Model
{
    use HasFactory;

    protected $fillable = [
        'default_fee',
        'punong_barangay_name',
        'barangay_secretary_name',
        'header_text',
        'footer_text',
        'is_active',
    ];

    protected $casts = [
        'default_fee' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}