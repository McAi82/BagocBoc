<?php
// app/Http/Controllers/Web/Settings/PersonnelController.php

namespace App\Http\Controllers\Web\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PersonnelController extends Controller
{
    use SendsNotifications;

    public function index(Request $request)
    {
        $query = User::with(['roles', 'resident']);

        if ($request->has('role')) {
            $query->whereHas('roles', function ($q) use ($request) {
                $q->where('name', $request->role);
            });
        }

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

        $users = $query->latest()->paginate(50);

        return $this->respondSuccess($users);
    }

    public function getByRole($roleName)
    {
        $users = User::with(['roles', 'resident'])
            ->whereHas('roles', function ($q) use ($roleName) {
                $q->where('name', $roleName);
            })->get();

        return $this->respondSuccess($users);
    }

    public function getRolesWithCount()
    {
        $roles = Role::withCount('users')->get();

        $result = $roles->map(function ($role) {
            return [
                'role' => $role->name,
                'count' => $role->users_count,
            ];
        });

        return $this->respondSuccess($result);
    }

    /**
     * Assign role to user
     * ✅ Notifies the user they gained a role
     */
    public function assignRole(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $user = User::find($request->user_id);
        $role = Role::find($request->role_id);

        if ($user->roles()->where('role_id', $request->role_id)->exists()) {
            return $this->respondError('User already has this role', null, 422);
        }

        $user->roles()->attach($request->role_id);

        // ✅ Notify the user
        $this->notifyUser(
            $user->id,
            '🎉 New Role Assigned',
            "You have been assigned the role of {$role->name}.",
            'role',
            'normal',
            null,
            Auth::id()
        );

        return $this->respondSuccess(
            $user->load('roles', 'resident'),
            'Role assigned successfully'
        );
    }

    /**
     * Remove role from user
     * ✅ Notifies the user
     */
    public function removeRole(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $user = User::find($request->user_id);
        $role = Role::find($request->role_id);

        if ($role->name === 'Super Admin') {
            $superAdminCount = User::whereHas('roles', function ($q) {
                $q->where('name', 'Super Admin');
            })->count();

            if ($superAdminCount <= 1) {
                return $this->respondError('Cannot remove the last Super Admin', null, 422);
            }
        }

        $user->roles()->detach($request->role_id);

        // ✅ Notify the user
        $this->notifyUser(
            $user->id,
            '⚠️ Role Removed',
            "The role '{$role->name}' has been removed from your account.",
            'role',
            'normal',
            null,
            Auth::id()
        );

        return $this->respondSuccess(
            $user->load('roles', 'resident'),
            'Role removed successfully'
        );
    }

    public function stats()
    {
        $roles = Role::withCount('users')->get();

        $stats = [
            'total_personnel' => User::count(),
            'by_role' => $roles->map(function ($role) {
                return [
                    'role' => $role->name,
                    'count' => $role->users_count,
                ];
            }),
        ];

        return $this->respondSuccess($stats);
    }
}
