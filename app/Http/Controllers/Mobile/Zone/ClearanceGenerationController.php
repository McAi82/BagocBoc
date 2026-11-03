<?php

namespace App\Http\Controllers\Mobile\Zone;

use App\Http\Controllers\Controller;
use App\Models\Clearance;
use App\Models\Resident;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClearanceGenerationController extends Controller
{
    use SendsNotifications;

    /**
     * Generate clearance for a resident
     * ✅ Notifies resident their clearance request was created
     */
    public function generate(Request $request, $residentId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'purpose' => 'required|string|max:255',
                'remarks' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $resident = Resident::find($residentId);

            if (!$resident) {
                return $this->respondNotFound('Resident not found');
            }

            $existing = Clearance::where('resident_id', $residentId)
                ->where('status', '!=', 'released')
                ->first();

            if ($existing) {
                return $this->respondError('Resident already has a pending clearance', null, 422);
            }

            $clearance = Clearance::create([
                'resident_id' => $residentId,
                'processed_by_user_id' => Auth::id(),
                'reference_number' => $this->generateReferenceNumber(),
                'purpose' => $request->purpose,
                'amount' => 50.00,
                'status' => 'pending',
                'valid_until' => now()->addYear(),
                'remarks' => $request->remarks,
            ]);

            // ✅ Notify resident
            $user = $this->getUserByResidentId($residentId);
            if ($user) {
                $this->notifyUser(
                    $user->id,
                    '📄 Barangay Clearance Requested',
                    "Your Barangay Clearance request ({$clearance->reference_number}) has been created by the Zone Leader and is pending approval.",
                    'clearance',
                    'normal',
                    '/resident/clearance/' . $clearance->id,
                    Auth::id(),
                    'clearance',
                    $clearance->id
                );
            }

            return $this->respondSuccess([
                'id' => $clearance->id,
                'reference_number' => $clearance->reference_number,
                'status' => $clearance->status,
                'amount' => $clearance->amount,
                'resident_name' => $resident->full_name,
                'purpose' => $clearance->purpose,
                'issued_at' => $clearance->created_at->toISOString(),
                'valid_until' => $clearance->valid_until->toISOString(),
            ], 'Clearance generated successfully');
        } catch (\Exception $e) {
            Log::error('Clearance generation error: ' . $e->getMessage());
            return $this->respondError('Failed to generate clearance', null, 500);
        }
    }

    public function show($id)
    {
        try {
            $clearance = Clearance::with(['resident', 'processedBy'])->find($id);

            if (!$clearance) {
                return $this->respondNotFound('Clearance not found');
            }

            return $this->respondSuccess([
                'id' => $clearance->id,
                'reference_number' => $clearance->reference_number,
                'resident_name' => $clearance->resident ? $clearance->resident->full_name : 'N/A',
                'resident_address' => $clearance->resident ? $clearance->resident->place_of_birth : 'N/A',
                'zone' => $clearance->resident ? $this->getResidentZone($clearance->resident_id) : 'N/A',
                'purpose' => $clearance->purpose,
                'status' => $clearance->status,
                'amount' => $clearance->amount,
                'issued_at' => $clearance->created_at,
                'valid_until' => $clearance->valid_until,
                'zone_leader_name' => Auth::user()->email,
                'barangay_captain' => $this->getBarangayCaptain(),
            ]);
        } catch (\Exception $e) {
            return $this->respondError('Failed to fetch clearance', null, 500);
        }
    }

    /**
     * Release clearance
     * ✅ Notifies resident their clearance is released
     */
    public function release($id)
    {
        try {
            $clearance = Clearance::find($id);

            if (!$clearance) {
                return $this->respondNotFound('Clearance not found');
            }

            if ($clearance->status !== 'approved' && $clearance->status !== 'pending') {
                return $this->respondError('Only pending or approved clearances can be released', null, 422);
            }

            $clearance->update([
                'status' => 'released',
                'issued_at' => now(),
                'released_at' => now(),
            ]);

            // ✅ Notify resident
            $user = $this->getUserByResidentId($clearance->resident_id);
            if ($user) {
                $this->notifyUser(
                    $user->id,
                    '✅ Barangay Clearance Released',
                    "Your Barangay Clearance ({$clearance->reference_number}) has been released and is available for download.",
                    'clearance',
                    'high',
                    '/resident/clearance/' . $clearance->id,
                    Auth::id(),
                    'clearance',
                    $clearance->id
                );
            }

            return $this->respondSuccess($clearance, 'Clearance released successfully');
        } catch (\Exception $e) {
            Log::error('Clearance release error: ' . $e->getMessage());
            return $this->respondError('Failed to release clearance', null, 500);
        }
    }

    private function generateReferenceNumber()
    {
        $year = date('Y');
        $prefix = 'CLR';
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $reference = "{$prefix}-{$year}-{$random}";

        while (Clearance::where('reference_number', $reference)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $reference = "{$prefix}-{$year}-{$random}";
        }

        return $reference;
    }

    private function getResidentZone($residentId)
    {
        $zone = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->join('barangay_zones', 'household_addresses.zone', '=', 'barangay_zones.id')
            ->where('resident_households.resident_id', $residentId)
            ->where('resident_households.status', 'active')
            ->value('barangay_zones.name');

        return $zone ?? 'N/A';
    }

    private function getBarangayCaptain()
    {
        return \App\Models\BarangayInfo::value('captain_name') ?? 'Barangay Captain';
    }
}
