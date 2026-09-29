<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChildCheckup extends Model
{
    protected $fillable = [
        'checkup_record_id',
        'weight',
        'height',
        'muac',
        'vaccines_given',
        'developmental_assessment',
    ];

    protected $casts = [
        'vaccines_given' => 'array',
    ];

    public function checkupRecord()
    {
        return $this->belongsTo(CheckupRecord::class);
    }
}