<?php

namespace App\Http\Controllers\Web\Geo;

use App\Http\Controllers\Controller;
use App\Models\HouseGeotag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class HouseGeotagController extends Controller
{
    /**
     * Get all geotags
     */
    public function index()
    {
        $geotags = HouseGeotag::with(['household.address', 'household.residents'])->get();

        return $this->respondSuccess($geotags);
    }

    /**
     * Get geotag by household
     */
    public function getByHousehold($householdId)
    {
        $geotag = HouseGeotag::with(['household.address', 'household.residents'])
            ->where('household_id', $householdId)
            ->first();

        if (!$geotag) {
            return $this->respondNotFound('Geotag not found for this household');
        }

        return $this->respondSuccess($geotag);
    }

    /**
     * Get geotags by zone
     */
    public function getByZone($zoneId)
    {
        $geotags = HouseGeotag::whereHas('household.address', function ($query) use ($zoneId) {
            $query->where('zone', $zoneId);
        })->with(['household.address', 'household.residents'])->get();

        return $this->respondSuccess($geotags);
    }

    /**
     * Store geotag
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'household_id' => 'required|exists:households,id',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'captured_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $geotag = HouseGeotag::updateOrCreate(
            ['household_id' => $request->household_id],
            [
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'captured_at' => $request->captured_at ?? now(),
            ]
        );

        return $this->respondSuccess(
            $geotag->load(['household.address', 'household.residents']),
            'Geotag created/updated successfully',
            201
        );
    }

    /**
     * Update geotag
     */
    public function update(Request $request, $id)
    {
        $geotag = HouseGeotag::find($id);

        if (!$geotag) {
            return $this->respondNotFound('Geotag not found');
        }

        $validator = Validator::make($request->all(), [
            'household_id' => 'sometimes|exists:households,id',
            'latitude' => 'sometimes|numeric',
            'longitude' => 'sometimes|numeric',
            'captured_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $geotag->update($request->all());

        return $this->respondSuccess(
            $geotag->load(['household.address', 'household.residents']),
            'Geotag updated successfully'
        );
    }

    /**
     * Delete geotag
     */
    public function destroy($id)
    {
        $geotag = HouseGeotag::find($id);

        if (!$geotag) {
            return $this->respondNotFound('Geotag not found');
        }

        $geotag->delete();

        return $this->respondSuccess(null, 'Geotag deleted successfully');
    }
}