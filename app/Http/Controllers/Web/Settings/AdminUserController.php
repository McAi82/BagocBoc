<?php
// app/Http/Controllers/Web/Settings/AdminUserController.php

namespace App\Http\Controllers\Web\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Resident;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminUserController extends Controller
{
    /**
     * Create a new user account (with or without resident)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role_ids' => 'required|array|min:1',
            'role_ids.*' => 'exists:roles,id',
            'resident_id' => 'nullable|exists:residents,id',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:20',
            'create_resident' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $residentId = $request->resident_id;

        // If create_resident is true and no resident_id provided, create a new resident
        if ($request->create_resident && !$residentId) {
            $residentValidator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'phone_number' => 'nullable|string|max:20',
                'gender' => 'nullable|in:Male,Female',
                'birth_date' => 'nullable|date',
                'civil_status' => 'nullable|in:Single,Married,Widow,Legally Separated',
                'place_of_birth' => 'nullable|string|max:255',
                'citizenship' => 'nullable|string|max:255',
                'education_attainment' => 'nullable|string|max:255',
                'voter_status' => 'nullable|in:Registered Local,Registered_Outside,Not Registered',
            ]);

            if ($residentValidator->fails()) {
                return $this->respondError('Validation error', $residentValidator->errors(), 422);
            }

            $resident = Resident::create([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'suffix' => $request->suffix,
                'phone_number' => $request->phone_number,
                'gender' => $request->gender ?? 'Male',
                'citizenship' => $request->citizenship ?? 'Filipino',
                'birth_date' => $request->birth_date ?? now()->subYears(25)->format('Y-m-d'),
                'place_of_birth' => $request->place_of_birth ?? 'Opol, Misamis Oriental',
                'civil_status' => $request->civil_status ?? 'Single',
                'voter_status' => $request->voter_status ?? 'Not Registered',
                'occupation' => $request->occupation,
                'monthly_income' => $request->monthly_income,
                'education_attainment' => $request->education_attainment ?? 'College Graduate',
                'status' => 'active',
            ]);

            $residentId = $resident->id;
        }

        // Create user
        $user = User::create([
            'resident_id' => $residentId,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'account_status' => 'active',
            'is_first_login' => true,
            'last_login_at' => null,
            'phone_verified_at' => null,
            'email_verified_at' => null,
        ]);

        // Assign roles
        $user->roles()->attach($request->role_ids);

        return $this->respondSuccess(
            $user->load('roles', 'resident'),
            'User account created successfully',
            201
        );
    }

    /**
     * Get users without resident accounts (for admin creation)
     */
    public function getUsersWithoutResident()
    {
        $users = User::whereNull('resident_id')
            ->with('roles')
            ->get();

        return $this->respondSuccess($users);
    }

    /**
     * Get available residents for user creation
     */
    public function getAvailableResidents()
    {
        $residents = Resident::whereDoesntHave('user')
            ->orWhereHas('user', function ($q) {
                $q->whereNull('resident_id');
            })
            ->get();

        return $this->respondSuccess($residents);
    }
}