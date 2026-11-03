<?php
// app/Http/Controllers/Web/Settings/SystemSettingsController.php

namespace App\Http\Controllers\Web\Settings;

use App\Http\Controllers\Controller;
use App\Models\BarangayInfo;
use App\Models\BarangayZone;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SystemSettingsController extends Controller
{
    // ============================================================
    // ROLES
    // ============================================================

    public function indexRoles()
    {
        $roles = Role::orderBy('name')->get();

        return $this->respondSuccess($roles);
    }

    public function storeRole(Request $request)
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

    public function showRole($id)
    {
        $role = Role::with('users')->find($id);

        if (!$role) {
            return $this->respondNotFound('Role not found');
        }

        return $this->respondSuccess($role);
    }

    public function updateRole(Request $request, $id)
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

    public function destroyRole($id)
    {
        $role = Role::find($id);

        if (!$role) {
            return $this->respondNotFound('Role not found');
        }

        if ($role->users()->count() > 0) {
            return $this->respondError('Cannot delete role with existing users', null, 422);
        }

        $role->delete();

        return $this->respondSuccess(null, 'Role deleted successfully');
    }

    // ============================================================
    // BARANGAY ZONES
    // ============================================================

    public function indexZones()
    {
        $zones = BarangayZone::withCount('householdAddresses')->get();

        return $this->respondSuccess($zones);
    }

    public function storeZone(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'zone_number' => 'required|integer|unique:barangay_zones',
            'name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $zone = BarangayZone::create($request->all());

        return $this->respondSuccess($zone, 'Zone created successfully', 201);
    }

    public function showZone($id)
    {
        $zone = BarangayZone::with('householdAddresses.households')->find($id);

        if (!$zone) {
            return $this->respondNotFound('Zone not found');
        }

        return $this->respondSuccess($zone);
    }

    public function updateZone(Request $request, $id)
    {
        $zone = BarangayZone::find($id);

        if (!$zone) {
            return $this->respondNotFound('Zone not found');
        }

        $validator = Validator::make($request->all(), [
            'zone_number' => 'sometimes|integer|unique:barangay_zones,zone_number,' . $id,
            'name' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $zone->update($request->all());

        return $this->respondSuccess($zone, 'Zone updated successfully');
    }

    public function destroyZone($id)
    {
        $zone = BarangayZone::find($id);

        if (!$zone) {
            return $this->respondNotFound('Zone not found');
        }

        if ($zone->householdAddresses()->count() > 0) {
            return $this->respondError('Cannot delete zone with existing household addresses', null, 422);
        }

        $zone->delete();

        return $this->respondSuccess(null, 'Zone deleted successfully');
    }

    // ============================================================
    // BARANGAY INFO
    // ============================================================

    public function showBarangayInfo()
    {
        $info = BarangayInfo::first();

        if (!$info) {
            $info = BarangayInfo::create([
                'name' => 'Bagocboc',
                'captain_name' => 'Marcos P. Gonzales',
                'municipality' => 'Opol',
                'province' => 'Misamis Oriental',
                'phone' => '+63 912 345 6789',
                'email' => 'bagocboc.opol@example.com',
                'address' => 'Zone 1, Barangay Bagocboc, Opol, Misamis Oriental',
                'logo_url' => null,
                'seal_url' => null,
            ]);
        }

        return $this->respondSuccess($info);
    }

    public function updateBarangayInfo(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'captain_name' => 'nullable|string|max:255',
            'municipality' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'logo_url' => 'nullable|string|max:500',
            'seal_url' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $info = BarangayInfo::first();

        if (!$info) {
            $info = BarangayInfo::create($request->all());
        } else {
            $info->update($request->all());
        }

        return $this->respondSuccess($info, 'Barangay information updated successfully');
    }
}