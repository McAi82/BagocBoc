<?php
// app/Http/Controllers/HouseholdLandingController.php

namespace App\Http\Controllers;

use App\Models\Household;
use App\Support\HouseholdLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Public landing page opened when someone scans a household QR code with
 * their phone camera.
 *
 * PRIVACY: this page is public (no login), so it only shows basic details.
 * Never shown: birth dates, ages, income, civil status, phone numbers, health
 * or census answers. Staff open the full record by signing in to the system.
 */
class HouseholdLandingController extends Controller
{
    /** Show the list of household members (names are shortened, e.g. "Maria S."). */
    private const SHOW_MEMBERS = true;

    /** Show an "Open in Maps" button using the household's geotag. */
    private const SHOW_MAP_LINK = true;

    private const RELATIONS = [
        'address.barangayZone',
        'residents',
        'latestCensus',
        'geotag',
    ];

    public function show(Request $request, string $token)
    {
        $barangay = $this->barangay();

        $householdId = HouseholdLink::resolve($token);
        if (!$householdId) {
            return $this->notFound($barangay);
        }

        try {
            $household = Household::with(self::RELATIONS)->find($householdId);
        } catch (\Throwable $e) {
            Log::error('Household landing failed', ['id' => $householdId, 'error' => $e->getMessage()]);

            return $this->notFound($barangay);
        }

        return $household
            ? $this->renderHousehold($household, $barangay)
            : $this->notFound($barangay);
    }

    /**
     * LEGACY links: /api/web/verify/{householdNumber}
     * Keeps QR codes that were already printed/stored with the old link working,
     * but shows the same privacy-safe page as the new signed links.
     * Remove this method + its route once all labels are reprinted with /h/{token}.
     */
    public function showLegacy(Request $request, string $householdNumber)
    {
        $barangay = $this->barangay();

        try {
            $household = Household::with(self::RELATIONS)
                ->where('household_number', $householdNumber)
                ->orWhere('household_tracking_number', $householdNumber)
                ->first();
        } catch (\Throwable $e) {
            Log::error('Legacy household landing failed', ['number' => $householdNumber, 'error' => $e->getMessage()]);

            return $this->notFound($barangay);
        }

        return $household
            ? $this->renderHousehold($household, $barangay)
            : $this->notFound($barangay);
    }

    private function renderHousehold(Household $household, array $barangay)
    {
        // ---- members -------------------------------------------------
        $residents = $household->residents;
        $head = $residents->first(fn($r) => (bool) ($r->pivot?->is_primary)) ?? $residents->first();

        $members = [];
        $living = 0;

        foreach ($residents as $r) {
            $vital = $r->vital_status ?? 'alive';
            if ($vital === 'alive') {
                $living++;
            }

            $members[] = [
                'name'         => $head && $r->id === $head->id
                    ? $r->full_name
                    : $this->shortName($r->first_name, $r->last_name),
                'relationship' => $r->pivot?->relationship_to_household,
                'is_head'      => $head && $r->id === $head->id,
                'note'         => match ($vital) {
                    'deceased' => 'Deceased',
                    'decedent' => 'Deceased property owner',
                    default    => null,
                },
            ];
        }

        // ---- map link --------------------------------------------------
        $mapUrl = null;
        if (self::SHOW_MAP_LINK && $household->geotag?->latitude && $household->geotag?->longitude) {
            $mapUrl = 'https://www.google.com/maps?q='
                . $household->geotag->latitude . ',' . $household->geotag->longitude;
        }

        $status = strtolower((string) ($household->status ?: 'active'));

        return $this->page('verify.household', [
            'barangay'  => $barangay,
            'household' => [
                'household_number' => $household->household_number,
                'tracking_number'  => $household->household_tracking_number,
                'status'           => ucfirst($status),
                'is_active'        => $status === 'active',
                'zone'             => $household->address?->barangayZone?->name,
                'street'           => $household->address?->street,
                'head'             => $head?->full_name,
                'member_count'     => $living,
                'members'          => self::SHOW_MEMBERS ? $members : [],
                'show_members'     => self::SHOW_MEMBERS,
                'census_year'      => $household->latestCensus?->census_year,
                'map_url'          => $mapUrl,
                // Staff continue in the system (login required there)
                'staff_url'        => url('/barangay-bagocboc/households/' . $household->id),
            ],
            'scanned_at' => now()->timezone(config('app.timezone'))->format('M j, Y g:i A'),
        ]);
    }


    /* ------------------------------------------------------------ */

    private function notFound(array $barangay)
    {
        return $this->page('verify.not-found', ['barangay' => $barangay], 404);
    }

    private function page(string $view, array $data, int $status = 200)
    {
        return response()
            ->view($view, $data, $status)
            ->withHeaders([
                'Cache-Control' => 'no-store, private',
                'X-Robots-Tag'  => 'noindex, nofollow',
            ]);
    }

    /** "Maria Santos" -> "Maria S." */
    private function shortName(?string $first, ?string $last): string
    {
        $first = trim((string) $first);
        $last  = trim((string) $last);

        if ($first === '' && $last === '') {
            return 'Resident';
        }

        return $first . ($last !== '' ? ' ' . mb_strtoupper(mb_substr($last, 0, 1)) . '.' : '');
    }

    private function barangay(): array
    {
        try {
            $info = DB::table('barangay_infos')->first();
        } catch (\Throwable $e) {
            $info = null;
        }

        return [
            'name'     => $info->name ?? 'Barangay Bagocboc',
            'location' => implode(', ', array_filter([
                $info->municipality ?? 'Opol',
                $info->province ?? 'Misamis Oriental',
            ])),
            'phone'    => $info->phone ?? null,
            'email'    => $info->email ?? null,
            'logo'     => $info->logo_url ?? null,
        ];
    }
}
