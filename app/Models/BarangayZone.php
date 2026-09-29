<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BarangayZone extends Model
{
    use HasFactory;

    protected $fillable = [
        'zone_number',
        'name',
    ];

    public function householdAddresses()
    {
        return $this->hasMany(HouseholdAddress::class, 'zone');
    }
}