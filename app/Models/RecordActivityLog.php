<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RecordActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'encoded_by',
        'record_id',
        'record_type',
        'action',
        'data_status',
        'details',
    ];

    public function encoder()
    {
        return $this->belongsTo(User::class, 'encoded_by');
    }

    public function record()
    {
        return $this->morphTo();
    }
}
