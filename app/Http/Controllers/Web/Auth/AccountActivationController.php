<?php
// app/Http/Controllers/Web/Auth/AccountActivationController.php

namespace App\Http\Controllers\Web\Auth;

use App\Http\Controllers\Controller;
use App\Models\AccountActivation;
use App\Models\Resident;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AccountActivationController extends Controller
{
    use SendsNotifications;

    /**
     * ✅ Verify resident records - now checks email too
     * The user must provide an email that matches a registered resident.
     */
    public function verifyRecords(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'firstName' => 'required|string',
            'middleName' => 'nullable|string',
            'lastName' => 'required|string',
            'suffix' => 'nullable|string',
            'birthDate' => 'required|date',
            'email' => 'required|email',  // ✅ ADD - must match resident record
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $query = Resident::where('first_name', $request->firstName)
            ->where('last_name', $request->lastName)
            ->whereDate('birth_date', $request->birthDate);

        // ✅ Match middle name (or null)
        if (!empty($request->middleName)) {
            $query->where('middle_name', $request->middleName);
        } else {
            $query->where(function ($q) {
                $q->whereNull('middle_name')->orWhere('middle_name', '');
            });
        }

        // ✅ Match suffix (or null)
        if (!empty($request->suffix)) {
            $query->where('suffix', $request->suffix);
        } else {
            $query->where(function ($q) {
                $q->whereNull('suffix')->orWhere('suffix', '');
            });
        }

        $resident = $query->first();

        if (!$resident) {
            return $this->respondNotFound('Information does not match our records.');
        }

        // ✅ CRITICAL: Verify that the provided email matches the resident's registered email
        if (!$resident->email) {
            return $this->respondError(
                'This resident record does not have an email on file. Please visit the barangay hall to update your records.',
                null,
                422
            );
        }

        if (strtolower(trim($resident->email)) !== strtolower(trim($request->email))) {
            return $this->respondError(
                'The email you provided does not match our records for this resident. Please use the email that was registered with the barangay, or visit the barangay hall to update your records.',
                null,
                422
            );
        }

        // ✅ Check if a user account already exists for this resident
        $existingUser = \App\Models\User::where('resident_id', $resident->id)->first();
        if ($existingUser) {
            return $this->respondError(
                'An account already exists for this resident. Please use the "Forgot Password" option if you cannot log in.',
                null,
                422
            );
        }

        return $this->respondSuccess([
            'resident_id' => $resident->id,
            'email' => $resident->email,
        ], 'Verification Complete!');
    }

    /**
     * Submit account activation
     * ✅ Notifies Front Desk + Secretary of the new request
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'id_type' => 'nullable|string',
            'id_front' => 'nullable|image|max:2048',
            'id_back' => 'nullable|image|max:2048',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $frontPath = $request->hasFile('id_front')
            ? $request->file('id_front')->store('id_documents', 'public')
            : null;

        $backPath = $request->hasFile('id_back')
            ? $request->file('id_back')->store('id_documents', 'public')
            : null;

        $referenceNumber = sprintf(
            '%03d %03d %03d %03d',
            random_int(0, 999),
            random_int(0, 999),
            random_int(0, 999),
            random_int(0, 999)
        );

        $activation = AccountActivation::create([
            'resident_id' => $request->resident_id,
            'reference_number' => $referenceNumber,
            'id_type' => $request->id_type ?? null,
            'id_front_path' => $frontPath,
            'id_back_path' => $backPath,
            'status' => 'pending',
        ]);

        try {
            $resident = Resident::find($request->resident_id);
            $residentName = $resident
                ? "{$resident->first_name} {$resident->last_name}"
                : "Resident #{$request->resident_id}";

            $this->notifyRoles(
                ['Front Desk Clerk', 'Barangay Secretary'],
                '🔔 New Account Activation Request',
                "{$residentName} has requested account activation. Reference: {$referenceNumber}.",
                'account',
                'high',
                '/settings/activations',
                Auth::id()
            );
        } catch (\Exception $e) {
            Log::error('Activation notify error: ' . $e->getMessage());
        }

        return $this->respondSuccess([
            'reference_number' => $activation->reference_number
        ], 'Account activation request submitted.', 201);
    }
}
