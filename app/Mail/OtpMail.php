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
    public string $subject;
    public string $headline;
    public string $intro;
    public string $expiresIn;

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

        // ✅ Resolve the copy for this purpose once, at construction
        //    time, so both the envelope() and content() share it.
        $copy = $this->copyForPurpose($purpose);

        $this->subject   = $copy['subject'];
        $this->headline  = $copy['headline'];
        $this->intro     = $copy['intro'];
        $this->expiresIn = $copy['expires'];
    }

    /**
     * Per-purpose email copy. Keeps the subject + headline + intro
     * in one place so a new purpose only needs a new case.
     */
    private function copyForPurpose(string $purpose): array
    {
        return match ($purpose) {
            'login' => [
                'subject'  => 'Barangay Bagocboc - Your Login Code',
                'headline' => 'Your login code',
                'intro'    => 'Use the code below to sign in to the Barangay Bagocboc mobile app.',
                'expires'  => '10 minutes',
            ],
            'is_first_login' => [
                'subject'  => 'Barangay Bagocboc - First Login Verification',
                'headline' => 'Verify your first login',
                'intro'    => 'Welcome! Enter the code below to activate your account and sign in for the first time.',
                'expires'  => '10 minutes',
            ],
            'password_reset' => [
                'subject'  => 'Barangay Bagocboc - Password Reset Code',
                'headline' => 'Reset your password',
                'intro'    => 'Enter the code below to reset your Barangay Bagocboc account password.',
                'expires'  => '10 minutes',
            ],
            'change_password' => [
                'subject'  => 'Barangay Bagocboc - Password Change Code',
                'headline' => 'Confirm your password change',
                'intro'    => 'Enter the code below to confirm the change to your password.',
                'expires'  => '10 minutes',
            ],
            'registration' => [
                'subject'  => 'Barangay Bagocboc - Registration Verification Code',
                'headline' => 'Verify your email',
                'intro'    => 'Thanks for registering with Barangay Bagocboc. Enter the code below to finish creating your account.',
                'expires'  => '10 minutes',
            ],
            default => [
                'subject'  => 'Barangay Bagocboc - Verification Code',
                'headline' => 'Your verification code',
                'intro'    => 'Enter the code below to continue.',
                'expires'  => '10 minutes',
            ],
        };
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.otp',
            with: [
                'otp'       => $this->otp,
                'userName'  => $this->userName,
                'email'     => $this->email,
                'purpose'   => $this->purpose,
                'subject'   => $this->subject,
                'headline'  => $this->headline,
                'intro'     => $this->intro,
                'expiresIn' => $this->expiresIn,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}