<?php
// app/Http/Controllers/Mobile/Auth/AuthController.php

namespace App\Http\Controllers\Mobile\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Otp;
use App\Models\Resident;
use App\Models\Role;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Mail\OtpMail;
use Illuminate\Support\Facades\Cache;

class AuthController extends Controller
{
    use SendsNotifications;

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
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

        $mobileOnlyRoles = [
            'Barangay Health Worker',
            'Zone Leader',
            'Resident',
            'Barangay Nutrition Scholar',
        ];

        $webAccessibleRoles = [
            'Super Admin',
            'Barangay Captain',
            'Barangay Secretary',
            'Front Desk Clerk',
            'Barangay Treasurer',
            'Midwife',
            'Nurse Deployment Program',
        ];

        $userRoles = $user->roles->pluck('name')->toArray();
        $hasWebAccess = !empty(array_intersect($userRoles, $webAccessibleRoles));

        if ($hasWebAccess) {
            return $this->respondForbidden(
                'This account has web access. Please use the web application.'
            );
        }

        $hasMobileAccess = !empty(array_intersect($userRoles, $mobileOnlyRoles));
        if (!$hasMobileAccess) {
            return $this->respondForbidden('This account is not authorized for mobile access.');
        }

        if ($user->account_status === 'inactive') {
            $user->tokens()->delete();
            return $this->respondError('Your account is deactivated.', null, 403);
        }

        if ($user->is_first_login) {
            Log::info("Mobile: User {$user->id} has is_first_login=true, sending OTP");
            $otpResponse = $this->sendOtp($user, 'is_first_login');
            if ($otpResponse->getStatusCode() !== 200) {
                return $otpResponse;
            }
            return $this->respondSuccess([
                'user_id' => $user->id,
                'requires_otp' => true,
                'purpose' => 'is_first_login',
                'email' => $user->email,
            ], 'OTP sent to your email address.', 200);
        }

        Log::info("Mobile: User {$user->id} logging in directly");
        $token = $user->createToken('mobile_auth_token')->plainTextToken;

        return $this->respondSuccess([
            'user' => $user,
            'roles' => $user->roles->pluck('name')->values(),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Login successful');
    }

    // ============================================================
    // ✅ NEW: REQUEST OTP FOR LOGIN
    // ============================================================
    //
    // Step 1 of the passwordless flow. Takes an email, verifies
    // the user exists and is allowed on mobile, then sends a code.
    //
    public function requestLoginOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $email = strtolower(trim($request->email));

        $user = User::with(['roles', 'resident'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (!$user) {
            // Don't reveal whether an email exists — same message either way.
            return $this->respondError(
                'If an account exists for this email, a code has been sent.',
                null,
                404
            );
        }

        // Same role gates as the password login
        $mobileOnlyRoles = [
            'Barangay Health Worker',
            'Zone Leader',
            'Resident',
            'Barangay Nutrition Scholar',
        ];

        $webAccessibleRoles = [
            'Super Admin',
            'Barangay Captain',
            'Barangay Secretary',
            'Front Desk Clerk',
            'Barangay Treasurer',
            'Midwife',
            'Nurse Deployment Program',
        ];

        $userRoles = $user->roles->pluck('name')->toArray();

        if (!empty(array_intersect($userRoles, $webAccessibleRoles))) {
            return $this->respondForbidden(
                'This account has web access. Please use the web application.'
            );
        }

        if (empty(array_intersect($userRoles, $mobileOnlyRoles))) {
            return $this->respondForbidden('This account is not authorized for mobile access.');
        }

        if ($user->account_status === 'inactive') {
            $user->tokens()->delete();
            return $this->respondError('Your account is deactivated.', null, 403);
        }

        // ✅ Send the OTP under the 'login' purpose
        $otpResponse = $this->sendOtp($user, 'login');
        if ($otpResponse->getStatusCode() !== 200) {
            return $otpResponse;
        }

        return $this->respondSuccess([
            'user_id' => $user->id,
            'email'   => $user->email,
            'purpose' => 'login',
            'requires_otp' => true,
        ], 'A login code has been sent to your email.', 200);
    }

    // ============================================================
    // ✅ NEW: VERIFY LOGIN OTP
    // ============================================================
    //
    // Step 2 of the passwordless flow. Takes user_id + otp + purpose
    // 'login' and returns the same payload the password login returns.
    //
    public function verifyLoginOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'otp'     => 'required|digits:6',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $user = User::findOrFail($request->user_id);

        if ($user->account_status === 'inactive') {
            $user->tokens()->delete();
            return $this->respondError('Your account is deactivated.', null, 403);
        }

        $otp = Otp::where('user_id', $user->id)
            ->where('purpose', 'login')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otp) {
            return $this->respondError('Code invalid or expired. Please request a new one.', null, 422);
        }

        if ($otp->attempts >= 5) {
            return $this->respondError('Too many attempts. Please request a new code.', null, 429);
        }

        if (!Hash::check($request->otp, $otp->code_hash)) {
            $otp->increment('attempts');
            return $this->respondError('Invalid code.', null, 422);
        }

        $otp->update(['used_at' => now(), 'attempts' => 0]);

        // Same-side effects as the password login
        $user->update(['last_login_at' => now()]);
        $user->load('roles', 'resident');

        $token = $user->createToken('mobile_auth_token')->plainTextToken;

        return $this->respondSuccess([
            'user'       => $user,
            'roles'      => $user->roles->pluck('name')->values(),
            'token'      => $token,
            'token_type' => 'Bearer',
        ], 'Login successful', 200);
    }

    public function verifyRegistrationOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'otp'   => 'required|digits:6',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $email = strtolower(trim($request->email));
        $pendingKey = 'pending_registration:' . $email;

        // ── 1. Load pending registration ─────────────────────────
        $pending = Cache::get($pendingKey);

        if (!$pending) {
            return $this->respondError(
                'Registration session expired. Please start over.',
                null,
                422
            );
        }

        // ── 2. Find the OTP ──────────────────────────────────────
        $otp = Otp::whereRaw('LOWER(email) = ?', [$email])
            ->where('purpose', 'registration')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otp) {
            return $this->respondError('OTP invalid or expired.', null, 422);
        }

        if ($otp->attempts >= 5) {
            return $this->respondError(
                'Too many attempts. Please request a new OTP.',
                null,
                429
            );
        }

        if (!Hash::check($request->otp, $otp->code_hash)) {
            $otp->increment('attempts');
            return $this->respondError('Invalid OTP.', null, 422);
        }

        // ── 3. Consume the OTP ───────────────────────────────────
        $otp->update(['used_at' => now(), 'attempts' => 0]);

        // ── 4. Create the User ───────────────────────────────────
        DB::beginTransaction();
        try {
            $resident = Resident::find($pending['resident_id']);

            if (!$resident) {
                DB::rollBack();
                Cache::forget($pendingKey);
                return $this->respondError('Resident record no longer exists.', null, 422);
            }

            // Guard against a race (e.g. two OTP submissions in parallel)
            if (User::where('resident_id', $resident->id)->exists()) {
                DB::rollBack();
                Cache::forget($pendingKey);
                return $this->respondError(
                    'An account already exists for this resident.',
                    null,
                    422
                );
            }

            $user = User::create([
                'resident_id'       => $resident->id,
                'email'             => $pending['email'],
                'password'          => $pending['password_hash'],
                'account_status'    => 'active',
                'is_first_login'    => false,
                'phone_verified_at' => now(),
                'email_verified_at' => now(),
            ]);

            if (!$resident->phone_number && !empty($pending['phone_number'])) {
                $resident->update(['phone_number' => $pending['phone_number']]);
            }

            $residentRole = Role::where('name', 'Resident')->first();
            if ($residentRole) {
                $user->roles()->attach($residentRole);
            }

            DB::commit();
            Cache::forget($pendingKey);

            // Notify front desk + secretary
            try {
                $this->notifyRoles(
                    ['Front Desk Clerk', 'Barangay Secretary'],
                    '👤 New Resident Registration',
                    "A new resident {$resident->first_name} {$resident->last_name} has registered via mobile.",
                    'registration',
                    'normal',
                    '/residents/' . $resident->id,
                    null
                );
            } catch (\Exception $e) {
                Log::error('Registration notify error: ' . $e->getMessage());
            }

            // Issue Sanctum token + return the user
            $user->load('roles', 'resident');
            $token = $user->createToken('mobile_auth_token')->plainTextToken;

            return $this->respondSuccess([
                'user'       => $user,
                'roles'      => $user->roles->pluck('name')->values(),
                'token'      => $token,
                'token_type' => 'Bearer',
            ], 'Registration successful.', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Registration verification error: ' . $e->getMessage());
            return $this->respondError(
                'Failed to complete registration.',
                null,
                500
            );
        }
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name'    => 'required|string|max:255',
            'last_name'     => 'required|string|max:255',
            'email'         => 'required|email',
            'phone_number'  => 'required|string|max:20',
            'password'      => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $email = strtolower(trim($request->email));

        // ── 1. Resident must exist ────────────────────────────────
        $resident = Resident::whereRaw('LOWER(email) = ?', [$email])->first();

        if (!$resident) {
            return $this->respondError(
                'This email is not registered with the barangay. Please visit the barangay hall to register your email first.',
                null,
                422
            );
        }

        // ── 2. Name must match ────────────────────────────────────
        $firstNameMatches = strtolower(trim($resident->first_name)) === strtolower(trim($request->first_name));
        $lastNameMatches  = strtolower(trim($resident->last_name))  === strtolower(trim($request->last_name));

        if (!$firstNameMatches || !$lastNameMatches) {
            return $this->respondError(
                'The name you provided does not match our records for this email. Please double-check your information.',
                null,
                422
            );
        }

        // ── 3. Existing User handling ─────────────────────────────
        $existingUser = User::where('resident_id', $resident->id)->first();

        if ($existingUser) {
            // Is this a stale auto-created account?
            //   • synthetic email (…@barangay.com)
            //   • is_first_login = true
            //   • never logged in
            $isStaleAutoCreated =
                str_contains($existingUser->email, '@barangay.com') &&
                $existingUser->is_first_login === true &&
                is_null($existingUser->last_login_at);

            if (!$isStaleAutoCreated) {
                // Real account — ask them to log in / reset password
                return $this->respondError(
                    'An account already exists for this resident. Please use the "Forgot Password" option if you cannot log in.',
                    null,
                    422
                );
            }

            // ✅ Reclaim: delete the stale record so we can recreate it fresh
            //    after OTP verification.
            DB::transaction(function () use ($existingUser) {
                $existingUser->roles()->detach();
                $existingUser->tokens()->delete();
                $existingUser->delete();
            });

            Log::info('Reclaimed stale auto-created user', [
                'resident_id' => $resident->id,
                'old_email'   => $existingUser->email,
                'new_email'   => $email,
            ]);
        }

        // ── 4. Email must not be claimed elsewhere ────────────────
        if (User::whereRaw('LOWER(email) = ?', [$email])->exists()) {
            return $this->respondError(
                'This email is already in use by another account. Please contact the barangay office.',
                null,
                422
            );
        }

        // ── 5. Cache the pending registration ─────────────────────
        $pendingKey = 'pending_registration:' . $email;

        Cache::put($pendingKey, [
            'resident_id'   => $resident->id,
            'email'         => $email,
            'first_name'    => trim($request->first_name),
            'last_name'     => trim($request->last_name),
            'phone_number'  => trim($request->phone_number),
            'password_hash' => Hash::make($request->password),
        ], now()->addMinutes(30));

        // ── 6. Send OTP ───────────────────────────────────────────
        Otp::whereRaw('LOWER(email) = ?', [$email])
            ->where('purpose', 'registration')
            ->whereNull('used_at')
            ->delete();

        $otp = random_int(100000, 999999);

        Otp::create([
            'user_id'    => null,
            'email'      => $email,
            'code_hash'  => Hash::make($otp),
            'purpose'    => 'registration',
            'expires_at' => now()->addMinutes(10),
            'attempts'   => 0,
            'sent_at'    => now(),
        ]);

        try {
            Mail::to($email)->send(new OtpMail($otp, (object)[
                'email'   => $email,
                'purpose' => 'registration',
            ], 'registration'));
        } catch (\Exception $e) {
            Log::error('Failed to send registration OTP: ' . $e->getMessage());
        }

        $response = [
            'email'        => $email,
            'requires_otp' => true,
            'purpose'      => 'registration',
        ];

        if (config('app.debug')) {
            $response['dev_otp'] = $otp;
        }

        return $this->respondSuccess($response, 'OTP sent to your email address.', 200);
    }

    public function sendOtp(User $user, string $purpose)
    {
        Log::info("MOBILE OTP SEND TRIGGERED for user: {$user->id}");

        $otp = random_int(100000, 999999);

        Otp::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->delete();

        $createdOtp = Otp::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'code_hash' => Hash::make($otp),
            'purpose' => $purpose,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'sent_at' => now(),
        ]);

        try {
            Mail::to($user->email)->send(new OtpMail($otp, $user, $purpose));
        } catch (\Exception $e) {
            Log::error("FAILED TO SEND MOBILE OTP: " . $e->getMessage());
        }

        return $this->respondSuccess([
            'user_id' => $user->id,
            'dev_otp' => $otp,
        ], 'OTP sent to your email address.');
    }

    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'otp' => 'required|digits:6',
            'purpose' => 'required|in:is_first_login,password_reset',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $user = User::findOrFail($request->user_id);

        $otp = Otp::where('user_id', $user->id)
            ->where('purpose', $request->purpose)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()->first();

        if (!$otp) {
            return $this->respondError('OTP invalid or expired', null, 422);
        }

        if ($otp->attempts >= 5) {
            return $this->respondError('Too many attempts. Please request a new OTP.', null, 429);
        }

        if (!Hash::check($request->otp, $otp->code_hash)) {
            $otp->update(['attempts' => $otp->attempts + 1]);
            return $this->respondError('Invalid OTP.', null, 422);
        }

        $otp->update(['used_at' => now(), 'attempts' => 0]);

        if ($request->purpose === 'is_first_login') {
            $user->update([
                'is_first_login' => false,
                'phone_verified_at' => now()
            ]);
        }

        if ($request->purpose === 'password_reset') {
            return $this->respondSuccess([
                'user_id' => $user->id,
            ], 'OTP verified for password reset', 200);
        }

        $user->load('roles', 'resident');
        $token = $user->createToken('mobile_auth_token')->plainTextToken;

        return $this->respondSuccess([
            'user' => $user,
            'roles' => $user->roles->pluck('name')->values(),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'OTP verified. Login successful', 200);
    }

    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'password' => 'required|string|min:8|confirmed'
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $user = User::findOrFail($request->user_id);

        $user->update([
            'password' => Hash::make($request->password),
            'is_first_login' => false,
        ]);

        $user->tokens()->delete();

        $this->notifyUser(
            $user->id,
            '🔐 Password Reset',
            'Your password has been successfully reset. If you did not do this, please contact the barangay immediately.',
            'account',
            'high'
        );

        return $this->respondSuccess(null, 'Password reset successfully. Please login again.', 200);
    }

    public function checkEmail(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'   => 'required|email',
            'purpose' => 'required|in:is_first_login,password_reset,registration',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $email = strtolower(trim($request->email));

        // ── Registration resend path ─────────────────────────────
        if ($request->purpose === 'registration') {
            $pending = Cache::get('pending_registration:' . $email);

            if (!$pending) {
                return $this->respondError(
                    'Registration session expired. Please start over.',
                    null,
                    422
                );
            }

            $otp = random_int(100000, 999999);

            Otp::whereRaw('LOWER(email) = ?', [$email])
                ->where('purpose', 'registration')
                ->whereNull('used_at')
                ->delete();

            Otp::create([
                'user_id'    => null,
                'email'      => $email,
                'code_hash'  => Hash::make($otp),
                'purpose'    => 'registration',
                'expires_at' => now()->addMinutes(10),
                'attempts'   => 0,
                'sent_at'    => now(),
            ]);

            try {
                Mail::to($email)->send(new OtpMail($otp, (object) [
                    'email'   => $email,
                    'purpose' => 'registration',
                ], 'registration'));
            } catch (\Exception $e) {
                Log::error('Resend registration OTP failed: ' . $e->getMessage());
            }

            $response = ['email' => $email];
            if (config('app.debug')) {
                $response['dev_otp'] = $otp;
            }

            return $this->respondSuccess($response, 'OTP resent to your email address.');
        }

        // ── Existing-user paths (login / password reset) ─────────
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (!$user) {
            return $this->respondNotFound('Email not registered');
        }

        return $this->sendOtp($user, $request->purpose);
    }

    public function user(Request $request)
    {
        $user = $request->user()->load('roles', 'resident');
        return $this->respondSuccess([
            'user' => $user,
            'roles' => $user->roles->pluck('name')->values(),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return $this->respondSuccess(null, 'Logged out successfully');
    }
}
