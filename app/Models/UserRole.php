<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class UserRole extends Pivot
{
    protected $table = 'user_roles';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'role_id'
    ];
}