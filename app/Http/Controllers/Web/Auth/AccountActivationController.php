<?php
// app/Http/Controllers/Web/Auth/AccountActivationController.php

namespace App\Http\Controllers\Web\Auth;

use App\Http\Controllers\Controller;
use App\Models\AccountActivation;
use App\Models\Resident;
use App\Models\User;
use App\Traits\GeneratesReferenceNumbers;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AccountActivationController extends Controller
{
    use SendsNotifications, GeneratesReferenceNumbers;

    public function verifyRecords(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'firstName'  => 'required|string',
            'middleName' => 'nullable|string',
            'lastName'   => 'required|string',
            'suffix'     => 'nullable|string',
            'birthDate'  => 'required|date',
            'email'      => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $email = strtolower(trim($request->email));

        // ── 1. Find the resident by email only ─────────────────────
        // (email is the unique anchor; name and DOB are validated after)
        $resident = Resident::whereRaw('LOWER(email) = ?', [$email])->first();

        if (!$resident) {
            return response()->json([
                'success' => false,
                'message' => 'No resident record found with this email. Please visit the barangay hall to register your email first.',
            ], 404);
        }

        // ── 2. Cross-check the person's identity ───────────────────
        $firstNameMatches = strtolower(trim($resident->first_name)) === strtolower(trim($request->firstName));
        $lastNameMatches  = strtolower(trim($resident->last_name))  === strtolower(trim($request->lastName));

        if (!$firstNameMatches || !$lastNameMatches) {
            return response()->json([
                'success' => false,
                'message' => 'The name you provided does not match our records for this email.',
            ], 422);
        }

        // Middle name (optional match)
        if ($request->filled('middleName') && $resident->middle_name) {
            $middleMatches = strtolower(trim($resident->middle_name)) === strtolower(trim($request->middleName));
            if (!$middleMatches) {
                return response()->json([
                    'success' => false,
                    'message' => 'The middle name you provided does not match our records.',
                ], 422);
            }
        }

        // Suffix (optional match)
        if ($request->filled('suffix') && $resident->suffix) {
            $suffixMatches = strtolower(trim($resident->suffix)) === strtolower(trim($request->suffix));
            if (!$suffixMatches) {
                return response()->json([
                    'success' => false,
                    'message' => 'The suffix you provided does not match our records.',
                ], 422);
            }
        }

        // Birth date
        try {
            $residentDob = \Carbon\Carbon::parse($resident->birth_date)->toDateString();
            $inputDob    = \Carbon\Carbon::parse($request->birthDate)->toDateString();

            if ($residentDob !== $inputDob) {
                return response()->json([
                    'success' => false,
                    'message' => 'The birth date you provided does not match our records.',
                ], 422);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid birth date format.',
            ], 422);
        }

        // ── 3. Resident is verified ✅ ─────────────────────────────
        // DO NOT check whether a User account exists here.
        // That check belongs to AuthController::register().
        return response()->json([
            'success' => true,
            'message' => 'Resident verified successfully.',
            'data' => [
                'resident_id' => $resident->id,
                'first_name'  => $resident->first_name,
                'last_name'   => $resident->last_name,
                'email'       => $resident->email,
            ],
        ], 200);
    }

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

        $referenceNumber = $this->generateActivationReference();

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
