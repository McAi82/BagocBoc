<?php

namespace App\Http\Controllers\Mobile\Geo;

use App\Http\Controllers\Controller;
use App\Models\BarangayZone;
use Illuminate\Http\Request;

class BarangayZoneController extends Controller
{
    /**
     * Get all barangay zones (view-only)
     */
    public function index()
    {
        $zones = BarangayZone::all();
        return $this->respondSuccess($zones);
    }

    /**
     * Get zone with households (view-only)
     */
    public function show($id)
    {
        $zone = BarangayZone::with('householdAddresses.households.residents')
            ->find($id);

        if (!$zone) {
            return $this->respondNotFound('Zone not found');
        }

        return $this->respondSuccess($zone);
    }
}
