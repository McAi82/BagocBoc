<?php
// app/Mail/OtpMail.php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public User $user;
    public string $purpose;

    /**
     * Create a new message instance.
     */
    public function __construct(string $otp, User $user, string $purpose = 'login')
    {
        $this->otp = $otp;
        $this->user = $user;
        $this->purpose = $purpose;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = match ($this->purpose) {
            'password_reset' => 'Barangay Bagocboc - Password Reset OTP',
            'registration'   => 'Barangay Bagocboc - Registration Verification Code',
            default          => 'Barangay Bagocboc - OTP Verification Code',
        };

        return new Envelope(subject: $subject);
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.otp',
            with: [
                'otp'      => $this->otp,
                'userName' => $this->user->resident?->first_name
                    ?? ($this->user->email ?? 'Resident'),
                'email'    => $this->user->email,
                'purpose'  => $this->purpose,
            ],
        );
    }

    // app/Mail/OtpMail.php
    public function build()
    {
        $subjects = [
            'is_first_login'  => 'Your Login Verification Code',
            'password_reset'  => 'Your Password Reset Code',
            'change_password' => 'Your Password Change Verification Code',
            'registration'    => 'Your Registration Verification Code',
        ];

        return $this->subject($subjects[$this->purpose] ?? 'Your OTP Code')
            ->view('emails.otp');
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
