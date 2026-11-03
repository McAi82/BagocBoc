<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Notification extends Model
{
    use HasFactory;

    protected $table = 'notifications';

    protected $fillable = [
        'sender_user_id',       // ✅ Removed recipient_user_id
        'title',
        'message',
        'category',
        'reference_type',
        'reference_id',
        'deep_link',
        'priority',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the sender of the notification
     */
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }

    /**
     * Get the recipients of the notification
     */
    public function recipients()
    {
        return $this->belongsToMany(User::class, 'notification_recipients', 'notification_id', 'user_id')
                    ->withPivot('is_read', 'read_at')
                    ->withTimestamps();
    }

    /**
     * Get the reference model (polymorphic)
     */
    public function reference()
    {
        return $this->morphTo();
    }

    /**
     * Scope a query to only include notifications for a user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->whereHas('recipients', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        });
    }

    /**
     * Scope a query to only include unread notifications for a user
     */
    public function scopeUnreadForUser($query, $userId)
    {
        return $query->whereHas('recipients', function ($q) use ($userId) {
            $q->where('user_id', $userId)
              ->where('is_read', false);
        });
    }

    /**
     * Get priority label
     */
    public function getPriorityLabelAttribute()
    {
        return [
            'low' => 'Low',
            'normal' => 'Normal',
            'high' => 'High',
        ][$this->priority] ?? 'Normal';
    }

    /**
     * Get priority color
     */
    public function getPriorityColorAttribute()
    {
        return [
            'low' => 'gray',
            'normal' => 'blue',
            'high' => 'red',
        ][$this->priority] ?? 'blue';
    }
}