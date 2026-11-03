<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'resident_id',
        'email',
        'password',
        'account_status',
        'is_first_login',
        'last_login_at',
        'phone_verified_at',
        'email_verified_at',
        'profile_photo_path',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'is_first_login' => 'boolean',
    ];

    protected $appends = ['profile_photo_url'];

    public function getProfilePhotoUrlAttribute(): ?string
    {
        if (!$this->profile_photo_path) return null;
        return url(Storage::disk('public')->url($this->profile_photo_path));
    }

    /**
     * Get the roles for the user.
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id');
    }

    /**
     * Get the resident associated with the user.
     */
    public function resident()
    {
        return $this->belongsTo(Resident::class, 'resident_id');
    }

    /**
     * Get the OTPs for the user.
     */
    public function otps()
    {
        return $this->hasMany(Otp::class);
    }

    /**
     * Get the notifications for the user.
     */
    public function notifications()
    {
        return $this->belongsToMany(Notification::class, 'notification_recipients', 'user_id', 'notification_id')
            ->withPivot('is_read', 'read_at')
            ->withTimestamps();
    }

    /**
     * Check if user has a specific role.
     */
    public function hasRole(string $roleName): bool
    {
        return $this->roles()->where('name', $roleName)->exists();
    }

    /**
     * Check if user has any of the given roles.
     */
    public function hasAnyRole(array $roleNames): bool
    {
        return $this->roles()->whereIn('name', $roleNames)->exists();
    }

    /**
     * Get user's full name from resident.
     */
    public function getFullNameAttribute(): string
    {
        if ($this->resident) {
            return $this->resident->full_name;
        }
        return $this->email ?? 'User';
    }
}
