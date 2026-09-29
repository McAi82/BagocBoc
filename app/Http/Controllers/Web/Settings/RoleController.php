<?php

namespace App\Http\Controllers\Web\Settings;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    /**
     * Get all roles
     */
    public function index()
    {
        $roles = Role::orderBy('name')->get();

        return $this->respondSuccess($roles);
    }

    /**
     * Create role
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:55|unique:roles,name',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $role = Role::create($request->all());

        return $this->respondSuccess($role, 'Role created successfully', 201);
    }

    /**
     * Show role
     */
    public function show($id)
    {
        $role = Role::with('users')->find($id);

        if (!$role) {
            return $this->respondNotFound('Role not found');
        }

        return $this->respondSuccess($role);
    }

    /**
     * Update role
     */
    public function update(Request $request, $id)
    {
        $role = Role::find($id);

        if (!$role) {
            return $this->respondNotFound('Role not found');
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:55|unique:roles,name,' . $id,
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $role->update($request->all());

        return $this->respondSuccess($role, 'Role updated successfully');
    }

    /**
     * Delete role
     */
    public function destroy($id)
    {
        $role = Role::find($id);

        if (!$role) {
            return $this->respondNotFound('Role not found');
        }

        // Check if role has users
        if ($role->users()->count() > 0) {
            return $this->respondError('Cannot delete role with existing users', null, 422);
        }

        $role->delete();

        return $this->respondSuccess(null, 'Role deleted successfully');
    }
}