<?php
// app/Http/Controllers/Web/Auth/AuthController.php

namespace App\Http\Controllers\Web\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Otp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\OtpMail;

class AuthController extends Controller
{
    /* ============================================================
     |  LOGIN
     ============================================================ */

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        if (!Auth::attempt($request->only('email', 'password'))) {
            return $this->respondError('Invalid login credentials', null, 401);
        }

        $user = User::with(['roles', 'resident'])
            ->where('email', $request->email)
            ->first();

        $webAccessibleRoles = [
            'Super Admin',
            'Barangay Captain',
            'Barangay Secretary',
            'Front Desk Clerk',
            'Barangay Treasurer',
            'Midwife',
            'Nurse Deployment Program',
            'Barangay Nutrition Scholar',
        ];

        $userRoles = $user->roles->pluck('name')->toArray();
        $hasWebAccess = !empty(array_intersect($userRoles, $webAccessibleRoles));

        if (!$hasWebAccess) {
            return $this->respondForbidden(
                'This account does not have web access. Please use the mobile application.'
            );
        }

        if ($user->account_status === 'inactive') {
            $user->tokens()->delete();
            return $this->respondError('Your account is deactivated.', null, 403);
        }

        if ($user->is_first_login == 1) {
            Log::info("Web: User {$user->id} has is_first_login=1, sending OTP to email: {$user->email}");

            $otp = $this->generateAndSendOtp($user, 'is_first_login');

            return response()->json([
                'status' => 'otp_required',
                'message' => 'OTP sent to your email address.',
                'data' => [
                    'user_id'      => $user->id,
                    'requires_otp' => true,
                    'purpose'      => 'is_first_login',
                    'email'        => $user->email,
                    'dev_otp'      => $otp,
                ],
            ], 200);
        }

        Log::info("Web: User {$user->id} has is_first_login=0, logging in directly");
        $token = $user->createToken('web_auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful',
            'data' => [
                'user'       => $user,
                'roles'      => $user->roles->pluck('name')->values(),
                'token'      => $token,
                'token_type' => 'Bearer',
            ],
        ], 200);
    }

    /* ============================================================
     |  OTP HELPER
     ============================================================ */

    private function generateAndSendOtp(User $user, string $purpose)
    {
        Log::info("Generating OTP for user: {$user->id} to email: {$user->email}");

        $otp = random_int(100000, 999999);

        Otp::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->delete();

        Otp::create([
            'user_id'    => $user->id,
            'email'      => $user->email,
            'code_hash'  => Hash::make($otp),
            'purpose'    => $purpose,
            'expires_at' => now()->addMinutes(5),
            'attempts'   => 0,
            'sent_at'    => now(),
        ]);

        Log::info("OTP CREATED", [
            'user_id' => $user->id,
            'email'   => $user->email,
            'otp'     => $otp,
            'purpose' => $purpose,
        ]);

        try {
            Mail::to($user->email)->send(new OtpMail($otp, $user, $purpose));
            Log::info("OTP EMAIL SENT SUCCESSFULLY to: {$user->email}");
        } catch (\Exception $e) {
            Log::error("FAILED TO SEND OTP EMAIL: " . $e->getMessage());
        }

        return $otp;
    }

    /* ============================================================
     |  VERIFY OTP (login / password reset)
     ============================================================ */

    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'otp'     => 'required|digits:6',
            'purpose' => 'required|in:is_first_login,password_reset',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::findOrFail($request->user_id);

        $otpRecord = Otp::where('user_id', $user->id)
            ->where('purpose', $request->purpose)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otpRecord) {
            return response()->json([
                'status'  => 'error',
                'message' => 'OTP invalid or expired. Please request a new one.',
            ], 422);
        }

        if ($otpRecord->attempts >= 5) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Too many attempts. Please request a new OTP.',
            ], 429);
        }

        if (!Hash::check($request->otp, $otpRecord->code_hash)) {
            $otpRecord->update(['attempts' => $otpRecord->attempts + 1]);
            return response()->json([
                'status'  => 'error',
                'message' => 'Invalid OTP. Please try again.',
            ], 422);
        }

        $otpRecord->update(['used_at' => now(), 'attempts' => 0]);

        if ($request->purpose === 'is_first_login') {
            $user->update([
                'is_first_login'    => 0,
                'phone_verified_at' => now(),
            ]);
            Log::info("User {$user->id} is_first_login set to 0 after OTP verification");
        }

        if ($request->purpose === 'password_reset') {
            return response()->json([
                'status'  => 'success',
                'message' => 'OTP verified for password reset',
                'data' => [
                    'user_id'  => $user->id,
                    'verified' => true,
                ],
            ], 200);
        }

        $user->load('roles', 'resident');
        $token = $user->createToken('web_auth_token')->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'OTP verified. Login successful.',
            'data' => [
                'user'       => $user,
                'roles'      => $user->roles->pluck('name')->values(),
                'token'      => $token,
                'token_type' => 'Bearer',
            ],
        ], 200);
    }

    /* ============================================================
     |  SEND OTP (public — used for forgot-password flows)
     ============================================================ */

    public function sendOtp(User $user, string $purpose)
    {
        Log::info("WEB OTP SEND TRIGGERED for user: {$user->id} to email: {$user->email}");

        $otp = random_int(100000, 999999);

        Otp::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->delete();

        $createdOtp = Otp::create([
            'user_id'    => $user->id,
            'email'      => $user->email,
            'code_hash'  => Hash::make($otp),
            'purpose'    => $purpose,
            'expires_at' => now()->addMinutes(5),
            'attempts'   => 0,
            'sent_at'    => now(),
        ]);

        Log::info("WEB OTP CREATED SUCCESSFULLY", [
            'otp_id'  => $createdOtp->id,
            'email'   => $createdOtp->email,
            'otp'     => $otp,
            'purpose' => $purpose,
        ]);

        try {
            Mail::to($user->email)->send(new OtpMail($otp, $user));
            Log::info("WEB OTP EMAIL SENT SUCCESSFULLY to: {$user->email}");
        } catch (\Exception $e) {
            Log::error("FAILED TO SEND WEB OTP EMAIL: " . $e->getMessage());
        }

        return $this->respondSuccess([
            'user_id' => $user->id,
            'dev_otp' => $otp,
        ], 'OTP sent to your email address.');
    }

    /* ============================================================
     |  FORGOT PASSWORD (verify OTP → set new password)
     ============================================================ */

    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id'  => 'required|exists:users,id',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $user = User::findOrFail($request->user_id);

        $user->update([
            'password'       => Hash::make($request->password),
            'is_first_login' => false,
        ]);

        $user->tokens()->delete();

        return $this->respondSuccess(null, 'Password reset successfully', 200);
    }

    public function checkEmail(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'   => 'required|email',
            'purpose' => 'required|in:is_first_login,password_reset',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return $this->respondNotFound('Email not registered');
        }

        $otp = $this->generateAndSendOtp($user, $request->purpose);

        return response()->json([
            'status'  => 'success',
            'message' => 'OTP sent to your email address.',
            'data' => [
                'user_id' => $user->id,
                'dev_otp' => $otp,
            ],
        ], 200);
    }

    /* ============================================================
     |  ✅ CHANGE PASSWORD (authenticated user)
     |     Step 1: requestChangePasswordOtp()
     |     Step 2: changePassword()
     ============================================================ */

    /**
     * Step 1 — Send OTP to the logged-in user's email.
     * Route: POST /web/auth/change-password/request-otp
     */
    public function requestChangePasswordOtp(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return $this->respondUnauthorized('Not authenticated');
        }

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        // Verify the current password before sending an OTP
        if (!Hash::check($request->current_password, $user->password)) {
            return $this->respondError('Current password is incorrect', null, 422);
        }

        $otp = random_int(100000, 999999);

        // Invalidate previous change-password OTPs
        Otp::where('user_id', $user->id)
            ->where('purpose', 'change_password')
            ->whereNull('used_at')
            ->delete();

        $created = Otp::create([
            'user_id'    => $user->id,
            'email'      => $user->email,
            'code_hash'  => Hash::make($otp),
            'purpose'    => 'change_password',
            'expires_at' => now()->addMinutes(5),
            'attempts'   => 0,
            'sent_at'    => now(),
        ]);

        Log::info("CHANGE PASSWORD OTP generated", [
            'otp_id' => $created->id,
            'email'  => $user->email,
            'otp'    => $otp,
        ]);

        try {
            Mail::to($user->email)->send(new OtpMail($otp, $user, 'change_password'));
            Log::info("CHANGE PASSWORD OTP EMAIL SENT to: {$user->email}");
        } catch (\Exception $e) {
            Log::error("FAILED TO SEND CHANGE PASSWORD OTP EMAIL: " . $e->getMessage());
        }

        return $this->respondSuccess([
            'user_id' => $user->id,
            'dev_otp' => $otp,
        ], 'OTP sent to your email address.');
    }

    /**
     * Step 2 — Verify OTP + commit the password change.
     * Route: POST /web/auth/change-password
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return $this->respondUnauthorized('Not authenticated');
        }

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
            'otp'              => 'required|digits:6',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        // 1. Verify current password again (defence in depth)
        if (!Hash::check($request->current_password, $user->password)) {
            return $this->respondError('Current password is incorrect', null, 422);
        }

        // 2. Verify OTP
        $otpRecord = Otp::where('user_id', $user->id)
            ->where('purpose', 'change_password')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otpRecord) {
            return $this->respondError(
                'OTP invalid or expired. Please request a new one.',
                null,
                422
            );
        }

        if ($otpRecord->attempts >= 5) {
            return $this->respondError(
                'Too many attempts. Please request a new OTP.',
                null,
                429
            );
        }

        if (!Hash::check($request->otp, $otpRecord->code_hash)) {
            $otpRecord->update(['attempts' => $otpRecord->attempts + 1]);
            return $this->respondError('Invalid OTP.', null, 422);
        }

        // 3. Consume the OTP
        $otpRecord->update(['used_at' => now(), 'attempts' => 0]);

        // 4. Commit the password change
        $user->update([
            'password'       => Hash::make($request->password),
            'is_first_login' => false,
        ]);

        // 5. Invalidate all tokens — force re-login
        $user->tokens()->delete();

        Log::info("Password changed successfully for user {$user->id}");

        return $this->respondSuccess(
            null,
            'Password changed successfully. Please log in again.',
            200
        );
    }

    /* ============================================================
     |  USER / LOGOUT
     ============================================================ */

    public function user(Request $request)
    {
        $user = $request->user()->load('roles', 'resident');
        return $this->respondSuccess([
            'user'  => $user,
            'roles' => $user->roles->pluck('name')->values(),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return $this->respondSuccess(null, 'Logged out successfully');
    }
}
