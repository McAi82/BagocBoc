{{-- resources/views/emails/otp.blade.php --}}
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7fc;
            margin: 0;
            padding: 0;
            color: #333;
        }

        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            border: 1px solid #e8ecf1;
        }

        .header {
            background: linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%);
            padding: 30px 40px;
            text-align: center;
        }

        .header h1 {
            color: #ffffff;
            font-size: 24px;
            margin: 0;
            font-weight: 700;
            letter-spacing: 0.5px;
        }

        .header p {
            color: #a8d5ba;
            font-size: 14px;
            margin: 8px 0 0 0;
        }

        .content {
            padding: 40px 40px 30px;
        }

        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #1a472a;
            margin-bottom: 8px;
        }

        .message {
            color: #555;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 24px;
        }

        .otp-container {
            background: #f0f7f3;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 2px dashed #2d6a4f;
            margin: 20px 0;
        }

        .otp-code {
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #1a472a;
            font-family: 'Courier New', monospace;
            background: #ffffff;
            padding: 12px 20px;
            border-radius: 8px;
            display: inline-block;
            border: 1px solid #d4e2d8;
        }

        .otp-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
            display: block;
        }

        .expiry {
            color: #888;
            font-size: 13px;
            margin-top: 12px;
        }

        .purpose {
            background: #e8f0fe;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            color: #1a472a;
            display: inline-block;
            margin-bottom: 12px;
        }

        .divider {
            border: none;
            border-top: 1px solid #e8ecf1;
            margin: 24px 0;
        }

        .footer {
            padding: 20px 40px 30px;
            text-align: center;
            background: #f8fafc;
            border-top: 1px solid #e8ecf1;
        }

        .footer p {
            color: #999;
            font-size: 12px;
            margin: 4px 0;
        }

        .footer .brand {
            color: #2d6a4f;
            font-weight: 600;
        }

        .note {
            background: #fff8e1;
            border-left: 4px solid #f5a623;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 13px;
            color: #6b5a2e;
            margin: 16px 0;
        }

        .email-chip {
            display: inline-block;
            background: #ffffff;
            border: 1px solid #d4e2d8;
            border-radius: 6px;
            padding: 4px 10px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #1a472a;
            word-break: break-all;
        }

        @media only screen and (max-width: 480px) {
            .container {
                margin: 20px;
                border-radius: 12px;
            }

            .header {
                padding: 20px;
            }

            .content {
                padding: 24px 20px;
            }

            .otp-code {
                font-size: 28px;
                letter-spacing: 6px;
                padding: 10px 16px;
            }

            .footer {
                padding: 16px 20px;
            }
        }
    </style>
</head>

<body>
    @php
    $purposeKey = $purpose ?? 'is_first_login';
    $userLabel = $userName ?? 'User';
    $emailLabel = $email ?? null;

    // Determine display strings based on purpose
    [$badgeIcon, $badgeText, $intro, $expiryMinutes] = match ($purposeKey) {
    'registration' => [
    '🎉',
    'Registration Verification',
    'Thank you for registering with Barangay Bagocboc. Please use the code below to verify your email address and finish creating your account.',
    10,
    ],
    'password_reset' => [
    '🔐',
    'Password Reset Verification',
    'You requested to reset your password. Please use the code below to continue.',
    5,
    ],
    'change_password' => [
    '🔑',
    'Password Change Verification',
    'You requested to change your password. Please use the code below to continue.',
    5,
    ],
    default => [
    '✅',
    'Account Verification',
    'Please use the code below to verify your identity and continue.',
    5,
    ],
    };
    @endphp

    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🏛️ Barangay Bagocboc</h1>
            <p>One-Time Password (OTP) Verification</p>
        </div>

        <!-- Content -->
        <div class="content">
            <p class="greeting">Hello, {{ $userLabel }}!</p>

            <div style="text-align: center;">
                <span class="purpose">
                    {{ $badgeIcon }} {{ $badgeText }}
                </span>
            </div>

            <p class="message">
                {{ $intro }}
                @if($emailLabel)
                <br><br>
                This code was sent to
                <span class="email-chip">{{ $emailLabel }}</span>
                @endif
            </p>

            <!-- OTP Code -->
            <div class="otp-container">
                <span class="otp-label">Your OTP Code</span>
                <div class="otp-code">{{ $otp }}</div>
                <p class="expiry">
                    ⏱️ This code will expire in
                    <strong>{{ $expiryMinutes }} minutes</strong>
                </p>
            </div>

            <div class="note">
                <strong>🔒 Security Note:</strong> Never share this OTP with anyone.
                Barangay Bagocboc will never ask for your OTP via phone or email.
            </div>

            <p class="message" style="font-size:14px; color:#888;">
                If you didn't request this code, please ignore this email or contact
                the Barangay Hall immediately.
            </p>

            <hr class="divider">

            <p style="font-size:13px; color:#666; text-align:center;">
                For assistance, contact Barangay Bagocboc at<br>
                📞 +63 912 345 6789 | ✉️ bagocboc.opol@example.com
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>&copy; 2026 <span class="brand">Barangay Bagocboc</span> — Opol, Misamis Oriental</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>

</html>