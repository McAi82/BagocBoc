<?php
// app/Http/Controllers/Mobile/Geo/HouseGeotagController.php

namespace App\Http\Controllers\Mobile\Geo;

use App\Http\Controllers\Controller;
use App\Models\HouseGeotag;
use App\Models\Household;
use App\Models\RecordActivityLog;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class HouseGeotagController extends Controller
{
    use SendsNotifications;

    /**
     * Get all geotags
     */
    public function index()
    {
        try {
            $geotags = HouseGeotag::with([
                'household.address',
                'household.address.barangayZone',
                'household.residents',
            ])->get();

            return $this->respondSuccess($geotags);
        } catch (\Exception $e) {
            Log::error('Geotags index error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch geotags', null, 500);
        }
    }

    /**
     * Create or update geotag for a household
     * ✅ Notifies Zone Leader when a household is geotagged
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'household_id' => 'required|exists:households,id',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'captured_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        try {
            $isNew = !HouseGeotag::where('household_id', $request->household_id)->exists();

            $geotag = HouseGeotag::updateOrCreate(
                ['household_id' => $request->household_id],
                [
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'captured_at' => $request->captured_at ?? now(),
                ]
            );

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $request->household_id,
                'record_type' => Household::class,
                'action' => $isNew ? 'Geotagged Household' : 'Updated Household Geotag',
                'data_status' => 'Saved',
                'details' => ($isNew ? 'Geotagged' : 'Updated geotag for') . " household ID {$request->household_id} at ({$request->latitude}, {$request->longitude})",
            ]);

            $geotag->load([
                'household.address',
                'household.address.barangayZone',
                'household.residents',
            ]);

            // ✅ Notify Zone Leaders when a new geotag is added
            if ($isNew) {
                $householdNumber = $geotag->household?->household_number ?? "ID {$request->household_id}";
                $zoneName = $geotag->household?->address?->barangayZone?->name ?? 'N/A';

                $this->notifyRole(
                    'Zone Leader',
                    '📍 Household Geotagged',
                    "Household {$householdNumber} in {$zoneName} has been geotagged.",
                    'geotag',
                    'normal',
                    '/geo/houses/household/' . $request->household_id,
                    Auth::id(),
                    'house_geotag',
                    $geotag->id
                );
            }

            return $this->respondSuccess(
                $geotag,
                $isNew ? 'House geotagged successfully' : 'Geotag updated successfully',
                $isNew ? 201 : 200
            );
        } catch (\Exception $e) {
            Log::error('Geotag store error: ' . $e->getMessage());
            return $this->respondError('Failed to save geotag: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Update geotag by ID
     */
    public function update(Request $request, $id)
    {
        $geotag = HouseGeotag::find($id);

        if (!$geotag) {
            return $this->respondNotFound('Geotag not found');
        }

        $validator = Validator::make($request->all(), [
            'household_id' => 'sometimes|exists:households,id',
            'latitude' => 'sometimes|numeric|between:-90,90',
            'longitude' => 'sometimes|numeric|between:-180,180',
            'captured_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        try {
            $geotag->update($request->only([
                'household_id',
                'latitude',
                'longitude',
                'captured_at',
            ]));

            $geotag->load([
                'household.address',
                'household.address.barangayZone',
                'household.residents',
            ]);

            return $this->respondSuccess($geotag, 'Geotag updated successfully');
        } catch (\Exception $e) {
            Log::error('Geotag update error: ' . $e->getMessage());
            return $this->respondError('Failed to update geotag', null, 500);
        }
    }

    public function destroy($id)
    {
        $geotag = HouseGeotag::find($id);

        if (!$geotag) {
            return $this->respondNotFound('Geotag not found');
        }

        $geotag->delete();
        return $this->respondSuccess(null, 'Geotag deleted successfully');
    }

    public function getByHousehold($householdId)
    {
        try {
            $geotag = HouseGeotag::with([
                'household.address',
                'household.address.barangayZone',
                'household.residents',
            ])
                ->where('household_id', $householdId)
                ->first();

            if (!$geotag) {
                return $this->respondNotFound('Geotag not found for this household');
            }

            return $this->respondSuccess($geotag);
        } catch (\Exception $e) {
            Log::error('Geotag by household error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch geotag', null, 500);
        }
    }

    public function getByZone($zoneId)
    {
        try {
            $geotags = HouseGeotag::whereHas('household.address', function ($query) use ($zoneId) {
                $query->where('zone', $zoneId);
            })
                ->with([
                    'household.address',
                    'household.address.barangayZone',
                    'household.residents',
                ])
                ->get();

            return $this->respondSuccess($geotags);
        } catch (\Exception $e) {
            Log::error('Geotags by zone error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch geotags', null, 500);
        }
    }
}
