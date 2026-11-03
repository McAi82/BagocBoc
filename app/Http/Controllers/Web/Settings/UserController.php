<?php
// app/Http/Controllers/Web/Settings/UserController.php

namespace App\Http\Controllers\Web\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    use SendsNotifications;

    public function index(Request $request)
    {
        $query = User::with(['roles', 'resident']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('email', 'LIKE', "%{$search}%")
                    ->orWhereHas('resident', function ($rq) use ($search) {
                        $rq->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%");
                    });
            });
        }

        $users = $query->latest()->get();

        return $this->respondSuccess($users);
    }

    public function show($id)
    {
        $user = User::with(['roles', 'resident'])->find($id);

        if (!$user) {
            return $this->respondNotFound('User not found');
        }

        return $this->respondSuccess($user);
    }

    public function update(Request $request, $id)
    {
        $user = User::with('resident')->findOrFail($id);

        $validated = $request->validate([
            'email'        => ['sometimes', 'email', 'unique:users,email,' . $id],
            'phone_number' => ['sometimes', 'nullable', 'string', 'max:20'],

            // Resident-only fields
            'first_name'   => ['sometimes', 'string', 'max:100'],
            'middle_name'  => ['sometimes', 'nullable', 'string', 'max:100'],
            'last_name'    => ['sometimes', 'string', 'max:100'],
            'suffix'       => ['sometimes', 'nullable', 'string', 'max:20'],

            'occupation'            => ['sometimes', 'nullable', 'string', 'max:255'],
            'education_attainment'  => ['sometimes', 'nullable', 'string', 'max:255'],

            // ✅ Profile photo upload
            'profile_photo' => ['sometimes', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_photo'  => ['sometimes', 'boolean'],
        ]);

        DB::beginTransaction();

        try {
            // ---------- User-level fields ----------
            $userUpdates = [];
            if (isset($validated['email'])) {
                $userUpdates['email'] = $validated['email'];
            }
            if (!$user->resident && isset($validated['phone_number'])) {
                $userUpdates['phone_number'] = $validated['phone_number'];
            }

            // ---------- Profile photo handling ----------
            if ($request->hasFile('profile_photo')) {
                // Delete the previous photo if it exists
                if ($user->profile_photo_path && Storage::disk('public')->exists($user->profile_photo_path)) {
                    Storage::disk('public')->delete($user->profile_photo_path);
                }

                $file = $request->file('profile_photo');
                $filename = 'profile-photos/' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
                Storage::disk('public')->put($filename, file_get_contents($file->getRealPath()));
                $userUpdates['profile_photo_path'] = $filename;
            } elseif (!empty($validated['remove_photo'])) {
                if ($user->profile_photo_path && Storage::disk('public')->exists($user->profile_photo_path)) {
                    Storage::disk('public')->delete($user->profile_photo_path);
                }
                $userUpdates['profile_photo_path'] = null;
            }

            if (!empty($userUpdates)) {
                $user->update($userUpdates);
            }

            // ---------- Resident-level fields ----------
            if ($user->resident) {
                $residentFields = [
                    'first_name',
                    'middle_name',
                    'last_name',
                    'suffix',
                    'place_of_birth',
                    'birth_date',
                    'gender',
                    'civil_status',
                    'phone_number',
                    'occupation',
                    'education_attainment',
                ];

                $residentUpdates = [];
                foreach ($residentFields as $field) {
                    if (array_key_exists($field, $validated)) {
                        $residentUpdates[$field] = $validated[$field];
                    }
                }

                if (!empty($residentUpdates)) {
                    $user->resident->update($residentUpdates);
                }
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Profile updated successfully.',
                'data'    => $user->fresh('resident'),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to update profile.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return $this->respondNotFound('User not found');
        }

        $user->tokens()->delete();
        $user->delete();

        return $this->respondSuccess(null, 'User deleted successfully');
    }

    /**
     * Toggle user status
     * ✅ Notifies the user their account status changed
     */
    public function toggleStatus($id)
    {
        $user = User::find($id);

        if (!$user) {
            return $this->respondNotFound('User not found');
        }

        $newStatus = $user->account_status === 'active' ? 'inactive' : 'active';
        $user->update(['account_status' => $newStatus]);

        // ✅ Notify the user
        try {
            $title = $newStatus === 'active' ? '✅ Account Activated' : '⚠️ Account Deactivated';
            $message = $newStatus === 'active'
                ? 'Your account has been activated. You can now use the app normally.'
                : 'Your account has been deactivated. Please contact the barangay office for assistance.';

            $this->notifyUser(
                $user->id,
                $title,
                $message,
                'account',
                'high',
                null,
                Auth::id()
            );
        } catch (\Exception $e) {
            Log::error('Toggle status notify error: ' . $e->getMessage());
        }

        return $this->respondSuccess([
            'user' => $user,
            'status' => $newStatus
        ], "User status updated to {$newStatus}");
    }
}
