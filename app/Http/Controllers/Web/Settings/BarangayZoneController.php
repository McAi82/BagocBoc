<?php

namespace App\Http\Controllers\Web\Settings;

use App\Http\Controllers\Controller;
use App\Models\BarangayZone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BarangayZoneController extends Controller
{
    /**
     * Get all zones
     */
    public function index()
    {
        $zones = BarangayZone::withCount('householdAddresses')->get();

        return $this->respondSuccess($zones);
    }

    /**
     * Create zone
     */
    public function store(Request $request)
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

    /**
     * Show zone
     */
    public function show($id)
    {
        $zone = BarangayZone::with('householdAddresses.households')->find($id);

        if (!$zone) {
            return $this->respondNotFound('Zone not found');
        }

        return $this->respondSuccess($zone);
    }

    /**
     * Update zone
     */
    public function update(Request $request, $id)
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

    /**
     * Delete zone
     */
    public function destroy($id)
    {
        $zone = BarangayZone::find($id);

        if (!$zone) {
            return $this->respondNotFound('Zone not found');
        }

        // Check if zone has household addresses
        if ($zone->householdAddresses()->count() > 0) {
            return $this->respondError('Cannot delete zone with existing household addresses', null, 422);
        }

        $zone->delete();

        return $this->respondSuccess(null, 'Zone deleted successfully');
    }
}