<?php
// app/Mail/OtpMail.php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public string $purpose;
    public string $email;
    public string $userName;

    /**
     * Accepts EITHER:
     *   • an App\Models\User instance
     *   • a stdClass with at least an `email` property
     *   • an array with at least an `email` key
     *   • a plain string email
     *
     * This keeps the existing login / password-reset callers
     * working while supporting the new registration flow
     * where no User exists yet.
     */
    public function __construct(string $otp, $user, string $purpose = 'login')
    {
        $this->otp     = $otp;
        $this->purpose = $purpose;

        if ($user instanceof \App\Models\User) {
            // ── Existing flow (login / password reset) ──
            $this->email    = $user->email;
            $this->userName = $user->resident?->first_name ?? $user->email;
        } elseif (is_object($user)) {
            // ── Registration flow (stdClass) ────────────
            $this->email    = $user->email ?? 'Resident';
            $this->userName = $user->resident?->first_name
                ?? $user->first_name
                ?? $user->name
                ?? ($user->email ?? 'Resident');
        } elseif (is_array($user)) {
            $this->email    = $user['email'] ?? 'Resident';
            $this->userName = $user['first_name']
                ?? $user['name']
                ?? ($user['email'] ?? 'Resident');
        } else {
            // ── Fallback: raw string ────────────────────
            $this->email    = (string) $user;
            $this->userName = (string) $user;
        }
    }

    public function envelope(): Envelope
    {
        $subject = match ($this->purpose) {
            'password_reset' => 'Barangay Bagocboc - Password Reset OTP',
            'registration'   => 'Barangay Bagocboc - Registration Verification Code',
            default          => 'Barangay Bagocboc - OTP Verification Code',
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.otp',
            with: [
                'otp'      => $this->otp,
                'userName' => $this->userName,
                'email'    => $this->email,
                'purpose'  => $this->purpose,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
