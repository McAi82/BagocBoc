<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AccountActivation extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'reference_number',
        'id_type',
        'id_front_path',
        'id_back_path',
        'status',
    ];

    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }
}