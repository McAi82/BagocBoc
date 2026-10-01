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

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone_number' => 'required|string|max:20',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $resident = Resident::where('email', strtolower(trim($request->email)))->first();

        if (!$resident) {
            return $this->respondError(
                'This email is not registered with the barangay. Please visit the barangay hall to register your email first.',
                null,
                422
            );
        }

        if (
            strtolower(trim($resident->first_name)) !== strtolower(trim($request->first_name)) ||
            strtolower(trim($resident->last_name)) !== strtolower(trim($request->last_name))
        ) {
            return $this->respondError(
                'The name you provided does not match our records for this email. Please double-check your information.',
                null,
                422
            );
        }

        if (User::where('resident_id', $resident->id)->exists()) {
            return $this->respondError(
                'An account already exists for this resident. Please use the "Forgot Password" option.',
                null,
                422
            );
        }

        DB::beginTransaction();
        try {
            $user = User::create([
                'resident_id' => $resident->id,
                'email' => strtolower(trim($request->email)),
                'password' => Hash::make($request->password),
                'account_status' => 'active',
                'is_first_login' => false,
                'phone_verified_at' => now(),
                'email_verified_at' => now(),
            ]);

            if (!$resident->phone_number && $request->phone_number) {
                $resident->update(['phone_number' => $request->phone_number]);
            }

            $residentRole = Role::where('name', 'Resident')->first();
            if ($residentRole) {
                $user->roles()->attach($residentRole);
            }

            DB::commit();

            $this->notifyRoles(
                ['Front Desk Clerk', 'Barangay Secretary'],
                '👤 New Resident Registration',
                "A new resident {$resident->first_name} {$resident->last_name} has registered via mobile.",
                'registration',
                'normal',
                '/residents/' . $resident->id,
                null
            );

            return $this->respondSuccess([
                'user_id' => $user->id,
                'email' => $user->email,
                'resident_id' => $resident->id,
                'message' => 'Registration successful. Please login.'
            ], 'Registration successful', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Registration error: ' . $e->getMessage());
            return $this->respondError('Failed to register: ' . $e->getMessage(), null, 500);
        }
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
            'email' => 'required|email',
            'purpose' => 'required|in:is_first_login,password_reset'
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $user = User::where('email', $request->email)->first();

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
