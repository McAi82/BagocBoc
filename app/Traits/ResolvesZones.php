<?php
// app/Traits/ResolvesZones.php

namespace App\Traits;

use App\Models\BarangayZone;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

trait ResolvesZones
{
    /**
     * Get the zone ID for a resident via their active household.
     */
    protected function resolveZoneForResident(?int $residentId): ?int
    {
        if (!$residentId) return null;

        $zoneId = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('resident_households.resident_id', $residentId)
            ->where('resident_households.status', 'active')
            ->value('household_addresses.zone');

        return $zoneId ? (int) $zoneId : null;
    }

    /**
     * Get the zone ID for a Zone Leader.
     * Strategy 1: their resident's active household.
     * Strategy 2: a `zone_id` column on users (if it exists).
     * Strategy 3: email pattern `zoneleaderN@...`.
     */
    protected function getZoneLeaderZone(?int $userId): ?int
    {
        if (!$userId) return null;

        try {
            $user = User::with('resident')->find($userId);
            if (!$user) return null;

            if ($user->resident) {
                $zoneId = $this->resolveZoneForResident($user->resident->id);
                if ($zoneId) return $zoneId;
            }

            if (!empty($user->zone_id)) {
                return (int) $user->zone_id;
            }

            if ($user->email && preg_match('/zoneleader(\d+)/i', $user->email, $m)) {
                $zone = BarangayZone::where('zone_number', (int) $m[1])->first();
                if ($zone) return (int) $zone->id;
            }

            return null;
        } catch (\Exception $e) {
            Log::error('getZoneLeaderZone error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get all active resident IDs in a zone.
     */
    protected function getResidentIdsByZone(int $zoneId)
    {
        return DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('household_addresses.zone', $zoneId)
            ->where('resident_households.status', 'active')
            ->pluck('resident_households.resident_id')
            ->unique()
            ->values();
    }
}