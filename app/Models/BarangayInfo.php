<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BarangayInfo extends Model
{
    use HasFactory;

    protected $table = 'barangay_infos';

    protected $fillable = [
        'name',
        'captain_name',
        'municipality',
        'province',
        'phone',
        'email',
        'address',
        'logo_url',
        'seal_url',
        'barangay_secretary',
        'barangay_treasurer',
        'about_us',
        'mission',
        'vision',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the full address
     */
    public function getFullAddressAttribute()
    {
        $parts = [];
        if ($this->address) $parts[] = $this->address;
        if ($this->municipality) $parts[] = $this->municipality;
        if ($this->province) $parts[] = $this->province;
        return implode(', ', $parts);
    }
}