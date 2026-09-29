<?php
// app/Http/Controllers/Mobile/Zone/RegistrationApprovalController.php

namespace App\Http\Controllers\Mobile\Zone;

use App\Http\Controllers\Controller;
use App\Models\AccountActivation;
use App\Models\Resident;
use App\Models\User;
use App\Models\Household;
use App\Models\HouseholdAddress;
use App\Models\HouseholdCensusRecord;
use App\Models\HouseholdEnvironment;
use App\Models\HouseGeotag;
use App\Models\RecordActivityLog;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\ResidentConfirmation;

class RegistrationApprovalController extends Controller
{
    use SendsNotifications;

    /**
     * Submit a new resident/household registration for approval (BHW)
     */
    public function submit(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'resident_id' => 'required|exists:residents,id',
                'household_id' => 'required|exists:households,id',
                'notes' => 'nullable|string',
                'census_data' => 'nullable|array',
                'geotag_data' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            DB::beginTransaction();

            $resident = Resident::find($request->resident_id);
            $resident->status = 'pending';
            $resident->save();

            $household = Household::find($request->household_id);
            $household->status = 'pending';
            $household->save();

            $census = null;
            if ($request->has('census_data') && $request->census_data) {
                $census = $this->saveCensusData($request->household_id, $request->census_data);
            }

            if ($request->has('geotag_data') && $request->geotag_data) {
                $this->saveGeotagData($request->household_id, $request->geotag_data);
            }

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $resident->id,
                'record_type' => Resident::class,
                'action' => 'Submitted for Approval',
                'data_status' => 'Pending',
                'details' => "Resident registration submitted for Zone Leader approval by " . Auth::user()->email,
            ]);

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $household->id,
                'record_type' => Household::class,
                'action' => 'Submitted for Approval',
                'data_status' => 'Pending',
                'details' => "Household registration submitted for Zone Leader approval by " . Auth::user()->email,
            ]);

            // ✅ Notify Zone Leaders
            $this->notifyZoneLeaders($resident, $household, $request->notes);

            DB::commit();

            return $this->respondSuccess([
                'resident_id' => $resident->id,
                'household_id' => $household->id,
                'census_id' => $census->id ?? null,
                'status' => 'pending',
                'message' => 'Registration submitted for approval successfully',
            ], 'Registration submitted for approval');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Submit registration error: ' . $e->getMessage());
            return $this->respondError('Failed to submit registration: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * ✅ FIXED: List pending registrations for the Zone Leader's zone
     * Now handles residents with or without a household, and falls back
     * to barangay-wide listing when a zone can't be resolved.
     */
    public function pending()
    {

        try {
            $zoneLeaderId = Auth::id();
            $zoneId = $this->getZoneLeaderZone($zoneLeaderId);


            $query = Resident::with([
                'households',
                'households.address',
                'households.address.barangayZone',
                'households.censusRecords',
            ])->where('status', 'pending');

            // Only scope by zone if we resolved one.
            if ($zoneId) {
                $query->where(function ($q) use ($zoneId) {
                    $q->whereHas('households.address', function ($sub) use ($zoneId) {
                        $sub->where('zone', $zoneId);
                    });
                    $q->orWhereDoesntHave('households');
                });
            }

            $residents = $query->latest()->get();


            $data = $residents->map(function ($resident) {
                $household = $resident->households->first();
                $census = $household ? $household->censusRecords->first() : null;
                $address = $household?->address;
                $zone = $address?->barangayZone;

                return [
                    'id' => $resident->id,
                    'resident_id' => $resident->id,
                    'resident_name' => trim(
                        ($resident->first_name ?? '') . ' ' .
                            ($resident->last_name ?? '')
                    ),
                    'first_name' => $resident->first_name,
                    'last_name' => $resident->last_name,
                    'middle_name' => $resident->middle_name,
                    'gender' => $resident->gender,
                    'birth_date' => $resident->birth_date,
                    'phone_number' => $resident->phone_number,
                    'email' => $resident->email,
                    'household_id' => $household?->id,
                    'household_number' => $household?->household_number,
                    'household_tracking_number' => $household?->household_tracking_number,
                    'address' => $address?->street,
                    'zone_name' => $zone?->name,
                    'zone_id' => $address?->zone,
                    'submitted_at' => $resident->created_at?->toISOString(),
                    'status' => $resident->status,
                    'notes' => $resident->remarks ?? null,
                    'census_id' => $census?->id,
                    'census_status' => $census?->data_status,
                ];
            });

            return $this->respondSuccess(
                $data,
                'Pending registrations retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->respondError(
                'Failed to get pending registrations: ' . $e->getMessage(),
                null,
                500
            );
        }
    }

    public function getStatus($residentId)
    {
        try {
            $resident = Resident::with(['households', 'households.censusRecords'])->find($residentId);

            if (!$resident) {
                return $this->respondNotFound('Resident not found');
            }

            $submissionLog = RecordActivityLog::where('record_id', $residentId)
                ->where('record_type', Resident::class)
                ->where('action', 'Submitted for Approval')
                ->where('encoded_by', Auth::id())
                ->first();

            $creationLog = RecordActivityLog::where('record_id', $residentId)
                ->where('record_type', Resident::class)
                ->whereIn('action', ['Created Residents', 'created'])
                ->where('encoded_by', Auth::id())
                ->first();

            $isOwner = $submissionLog !== null || $creationLog !== null;

            if (!$isOwner) {
                $user = User::with('roles')->find(Auth::id());
                $isZoneLeader = $user->roles->contains('name', 'Zone Leader');

                if (!$isZoneLeader) {
                    return $this->respondForbidden('You do not have permission to check this resident\'s status.');
                }
            }

            $latestLog = RecordActivityLog::where('record_id', $residentId)
                ->where('record_type', Resident::class)
                ->whereIn('action', ['Approved', 'Rejected', 'Submitted for Approval'])
                ->latest()->first();

            $status = 'pending';
            $reason = null;
            $approvedAt = null;
            $approvedBy = null;

            if ($latestLog) {
                if ($latestLog->action === 'Approved') {
                    $status = 'approved';
                    $approvedAt = $latestLog->created_at;
                    $approvedBy = $latestLog->encoder->email ?? null;
                } elseif ($latestLog->action === 'Rejected') {
                    $status = 'rejected';
                    $reason = $latestLog->details;
                }
            }

            if ($resident->status === 'active') $status = 'approved';
            elseif ($resident->status === 'inactive') $status = 'rejected';

            $household = $resident->households->first();
            $census = $household ? $household->censusRecords->first() : null;

            return $this->respondSuccess([
                'resident_id' => $residentId,
                'resident_name' => $resident->first_name . ' ' . $resident->last_name,
                'status' => $status,
                'reason' => $reason,
                'approved_at' => $approvedAt,
                'approved_by' => $approvedBy,
                'submitted_at' => $resident->created_at->toISOString(),
                'is_owner' => $isOwner,
                'census_id' => $census ? $census->id : null,
                'census_status' => $census ? $census->data_status : null,
                'household_id' => $household ? $household->id : null,
                'household_status' => $household ? $household->status : null,
            ], 'Status retrieved successfully');
        } catch (\Exception $e) {
            return $this->respondError('Failed to get status: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Approve registration
     */
    public function approve($id)
    {
        try {
            DB::beginTransaction();

            $resident = Resident::with(['households'])->find($id);
            if (!$resident) {
                return $this->respondNotFound('Resident not found');
            }

            if ($resident->status !== 'pending') {
                return $this->respondError('Only pending registrations can be approved', null, 422);
            }

            $resident->status = 'active';
            $resident->save();

            $household = $resident->households->first();
            $censusRecord = null;
            if ($household) {
                $household->status = 'active';
                $household->save();

                $censusRecord = HouseholdCensusRecord::where('household_id', $household->id)
                    ->where('data_status', 'Pending')
                    ->first();

                if ($censusRecord) {
                    $censusRecord->update(['data_status' => 'Approved']);
                }
            }

            $user = $this->createUserAccount($resident);

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $resident->id,
                'record_type' => Resident::class,
                'action' => 'Approved',
                'data_status' => 'Active',
                'details' => "Registration approved by Zone Leader: " . Auth::user()->email,
            ]);

            if ($censusRecord) {
                RecordActivityLog::create([
                    'encoded_by' => Auth::id(),
                    'record_id' => $censusRecord->id,
                    'record_type' => HouseholdCensusRecord::class,
                    'action' => 'Approved',
                    'data_status' => 'Approved',
                    'details' => "Census record approved by Zone Leader: " . Auth::user()->email,
                ]);
            }

            $this->notifySubmittingBHWs($resident, 'approved');

            DB::commit();

            return $this->respondSuccess([
                'resident_id' => $resident->id,
                'resident_name' => $resident->first_name . ' ' . $resident->last_name,
                'user_id' => $user ? $user->id : null,
                'status' => 'approved',
                'household_id' => $household ? $household->id : null,
                'household_status' => $household ? $household->status : null,
                'census_id' => $censusRecord->id ?? null,
                'census_status' => $censusRecord->data_status ?? null,
                'message' => 'Registration approved successfully',
            ], 'Registration approved successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Approve registration error: ' . $e->getMessage());
            return $this->respondError('Failed to approve registration: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Reject registration
     */
    public function reject(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:500',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            DB::beginTransaction();

            $resident = Resident::find($id);
            if (!$resident) {
                return $this->respondNotFound('Resident not found');
            }

            if ($resident->status !== 'pending') {
                return $this->respondError('Only pending registrations can be rejected', null, 422);
            }

            $resident->status = 'inactive';
            $resident->remarks = $request->reason;
            $resident->save();

            $household = $resident->households->first();
            $censusRecord = null;
            if ($household) {
                $household->status = 'inactive';
                $household->save();

                $censusRecord = HouseholdCensusRecord::where('household_id', $household->id)
                    ->where('data_status', 'Pending')
                    ->first();

                if ($censusRecord) {
                    $censusRecord->update(['data_status' => 'Rejected']);
                }
            }

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $resident->id,
                'record_type' => Resident::class,
                'action' => 'Rejected',
                'data_status' => 'Inactive',
                'details' => "Registration rejected by Zone Leader: " . Auth::user()->email . ". Reason: " . $request->reason,
            ]);

            if ($censusRecord) {
                RecordActivityLog::create([
                    'encoded_by' => Auth::id(),
                    'record_id' => $censusRecord->id,
                    'record_type' => HouseholdCensusRecord::class,
                    'action' => 'Rejected',
                    'data_status' => 'Rejected',
                    'details' => "Census record rejected by Zone Leader: " . Auth::user()->email . ". Reason: " . $request->reason,
                ]);
            }

            $this->notifySubmittingBHWs($resident, 'rejected', $request->reason);

            DB::commit();

            return $this->respondSuccess([
                'resident_id' => $resident->id,
                'resident_name' => $resident->first_name . ' ' . $resident->last_name,
                'status' => 'rejected',
                'reason' => $request->reason,
                'household_id' => $household ? $household->id : null,
                'census_id' => $censusRecord->id ?? null,
                'census_status' => $censusRecord->data_status ?? null,
                'message' => 'Registration rejected successfully',
            ], 'Registration rejected');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Reject registration error: ' . $e->getMessage());
            return $this->respondError('Failed to reject registration: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    /**
     * ✅ FIXED: Resolve the zone ID for a Zone Leader.
     * Tries multiple strategies so this works even if the Zone Leader
     * isn't registered as a resident with a household.
     */
    private function getZoneLeaderZone($userId)
    {
        try {
            $user = User::with('resident')->find($userId);
            if (!$user) {
                Log::info('Zone leader user not found', ['user_id' => $userId]);
                return null;
            }

            // Strategy 1: Zone Leader has a resident record with an active household
            if ($user->resident) {
                $zoneId = DB::table('resident_households')
                    ->join('households', 'resident_households.household_id', '=', 'households.id')
                    ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
                    ->where('resident_households.resident_id', $user->resident->id)
                    ->where('resident_households.status', 'active')
                    ->value('household_addresses.zone');

                if ($zoneId) {
                    Log::info('Zone leader zone resolved via resident household', [
                        'user_id' => $userId,
                        'zone_id' => $zoneId,
                    ]);
                    return $zoneId;
                }
            }

            // Strategy 2: Check if we store a zone_id directly on the user (if your schema has it)
            if (property_exists($user, 'zone_id') || isset($user->zone_id)) {
                if (!empty($user->zone_id)) {
                    Log::info('Zone leader zone resolved via user.zone_id', [
                        'user_id' => $userId,
                        'zone_id' => $user->zone_id,
                    ]);
                    return $user->zone_id;
                }
            }

            // Strategy 3: Try to match by email pattern (e.g. zoneleader1@gmail.com → zone 1)
            if ($user->email && preg_match('/zoneleader(\d+)/i', $user->email, $m)) {
                $zoneNumber = (int) $m[1];
                $zone = \App\Models\BarangayZone::where('zone_number', $zoneNumber)->first();
                if ($zone) {
                    Log::info('Zone leader zone resolved via email pattern', [
                        'user_id' => $userId,
                        'zone_id' => $zone->id,
                    ]);
                    return $zone->id;
                }
            }

            Log::warning('Could not resolve zone for Zone Leader — pending list will not be zone-filtered', [
                'user_id' => $userId,
                'email' => $user->email,
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('getZoneLeaderZone error: ' . $e->getMessage());
            return null;
        }
    }

    private function saveCensusData($householdId, $censusData)
    {
        $existingCensus = HouseholdCensusRecord::where('household_id', $householdId)
            ->where('census_year', $censusData['census_year'] ?? date('Y'))
            ->first();

        if ($existingCensus) {
            $existingCensus->update([
                'census_date' => $censusData['census_date'] ?? now(),
                'monthly_income' => $censusData['monthly_income'] ?? null,
                'data_status' => 'Pending',
            ]);

            if (isset($censusData['environment'])) {
                $environment = HouseholdEnvironment::where('household_census_id', $existingCensus->id)->first();
                if ($environment) {
                    $environment->update($censusData['environment']);
                } else {
                    HouseholdEnvironment::create(array_merge(
                        ['household_census_id' => $existingCensus->id],
                        $censusData['environment']
                    ));
                }
            }

            return $existingCensus;
        }

        $census = HouseholdCensusRecord::create([
            'household_id' => $householdId,
            'census_year' => $censusData['census_year'] ?? date('Y'),
            'census_date' => $censusData['census_date'] ?? now(),
            'monthly_income' => $censusData['monthly_income'] ?? null,
            'encoded_by' => Auth::id(),
            'data_status' => 'Pending',
        ]);

        if (isset($censusData['environment'])) {
            HouseholdEnvironment::create(array_merge(
                ['household_census_id' => $census->id],
                $censusData['environment']
            ));
        }

        return $census;
    }

    private function saveGeotagData($householdId, $geotagData)
    {
        HouseGeotag::updateOrCreate(
            ['household_id' => $householdId],
            [
                'latitude' => $geotagData['latitude'] ?? 0,
                'longitude' => $geotagData['longitude'] ?? 0,
                'captured_at' => $geotagData['captured_at'] ?? now(),
            ]
        );
    }

    private function createUserAccount($resident)
    {
        try {
            $existingUser = User::where('resident_id', $resident->id)->first();
            if ($existingUser) return $existingUser;

            $email = strtolower($resident->first_name . '.' . $resident->last_name . '@barangay.com');
            $email = str_replace(' ', '', $email);

            if (User::where('email', $email)->exists()) {
                $email = strtolower($resident->first_name . '.' . $resident->last_name . '.' . rand(1, 999) . '@barangay.com');
                $email = str_replace(' ', '', $email);
            }

            $user = User::create([
                'resident_id' => $resident->id,
                'email' => $email,
                'password' => bcrypt('password123'),
                'account_status' => 'active',
                'is_first_login' => true,
            ]);

            $residentRole = \App\Models\Role::where('name', 'Resident')->first();
            if ($residentRole) {
                $user->roles()->attach($residentRole);
            }

            return $user;
        } catch (\Exception $e) {
            Log::error('Create user account error: ' . $e->getMessage());
            return null;
        }
    }

    private function notifySubmittingBHWs($resident, string $status, ?string $reason = null)
    {
        try {
            $submitterIds = RecordActivityLog::where('record_id', $resident->id)
                ->where('record_type', Resident::class)
                ->where('action', 'Submitted for Approval')
                ->pluck('encoded_by')
                ->unique()
                ->toArray();

            if (empty($submitterIds)) {
                $submitterIds = User::whereHas('roles', function ($q) {
                    $q->where('name', 'Barangay Health Worker');
                })->pluck('id')->toArray();
            }

            if (empty($submitterIds)) return;

            $residentName = "{$resident->first_name} {$resident->last_name}";

            if ($status === 'approved') {
                $this->notify(
                    $submitterIds,
                    '✅ Registration Approved',
                    "The registration for {$residentName} has been approved by the Zone Leader.",
                    'registration',
                    'high',
                    '/registrations/status/' . $resident->id,
                    Auth::id(),
                    'resident',
                    $resident->id
                );
            } else {
                $this->notify(
                    $submitterIds,
                    '❌ Registration Rejected',
                    "The registration for {$residentName} was rejected. Reason: " . ($reason ?? 'Not specified'),
                    'registration',
                    'high',
                    '/registrations/status/' . $resident->id,
                    Auth::id(),
                    'resident',
                    $resident->id
                );
            }
        } catch (\Exception $e) {
            Log::error('Notify BHW error: ' . $e->getMessage());
        }
    }

    private function notifyZoneLeaders($resident, $household, $notes)
    {
        try {
            $zoneId = $household?->address?->zone
                ?? $resident->households()->first()?->address?->zone;

            if (!$zoneId) {
                Log::warning('Cannot notify zone leaders — no zone found for registration', [
                    'resident_id' => $resident->id,
                    'household_id' => $household?->id,
                ]);
                return;
            }

            $message = "New registration submitted for approval.\n";
            $message .= "Resident: {$resident->first_name} {$resident->last_name}\n";
            $message .= "Household: " . ($household ? $household->household_number : 'N/A');
            if ($notes) {
                $message .= "\nNotes: {$notes}";
            }

            $this->notifyZoneLeadersInZone(
                (int) $zoneId,
                '📥 New Registration for Approval',
                $message,
                'registration',
                'high',
                '/zone/registrations/pending',
                Auth::id(),
                'resident',
                $resident->id
            );
        } catch (\Exception $e) {
            Log::error('Notify zone leaders error: ' . $e->getMessage());
        }
    }

    public function pendingConfirmations()
    {
        try {
            $userId = Auth::id();

            Log::info('🚨 pendingConfirmations() CALLED', [
                'user_id' => $userId,
                'email' => Auth::user()?->email,
            ]);

            // Try matching by zone_leader_id first
            $query = ResidentConfirmation::with([
                'resident',
                'resident.households',
                'resident.households.address',
                'resident.households.address.barangayZone',
                'requestedBy',
                'requestedBy.resident',
                'zoneLeader',
                'zoneLeader.resident',
            ])->where('status', 'pending');

            $byLeader = (clone $query)->where('zone_leader_id', $userId)->count();
            Log::info('   Pending for this zone leader_id: ' . $byLeader);

            $rows = $query->where('zone_leader_id', $userId)
                ->latest()
                ->get();

            // ✅ Fallback: if we found none specifically assigned to this user,
            //    return ALL pending confirmations (a fresh Zone Leader may
            //    not have any assigned yet).
            if ($rows->isEmpty()) {
                Log::info('   No rows for this zone leader — falling back to ALL pending');
                $rows = ResidentConfirmation::with([
                    'resident',
                    'resident.households',
                    'resident.households.address',
                    'resident.households.address.barangayZone',
                    'requestedBy',
                    'requestedBy.resident',
                    'zoneLeader',
                    'zoneLeader.resident',
                ])
                    ->where('status', 'pending')
                    ->latest()
                    ->get();
            }

            Log::info('   Returning ' . $rows->count() . ' confirmation rows');

            $data = $rows->map(function ($c) {
                $resident = $c->resident;
                $household = $resident?->households?->first();
                $address = $household?->address;
                $zone = $address?->barangayZone;

                $requestedByName = null;
                if ($c->requestedBy) {
                    $requestedByName =
                        $c->requestedBy->resident?->full_name
                        ?? $c->requestedBy->email;
                }

                return [
                    // Core fields the mobile Registration interface expects
                    'id' => $c->id,
                    'resident_id' => $c->resident_id,
                    'resident_name' => $resident
                        ? trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''))
                        : 'Unknown',

                    // Resident detail
                    'first_name' => $resident?->first_name,
                    'last_name' => $resident?->last_name,
                    'middle_name' => $resident?->middle_name,
                    'gender' => $resident?->gender,
                    'birth_date' => $resident?->birth_date,
                    'phone_number' => $resident?->phone_number,
                    'email' => $resident?->email,

                    // Household / zone
                    'household_id' => $household?->id,
                    'household_number' => $household?->household_number,
                    'household_tracking_number' => $household?->household_tracking_number,
                    'address' => $address?->street,
                    'zone_name' => $zone?->name,
                    'zone_id' => $address?->zone,

                    // Confirmation metadata
                    'status' => $c->status,
                    'notes' => $c->notes,
                    'submitted_at' => $c->created_at?->toISOString(),
                    'requested_at' => $c->created_at?->toISOString(),
                    'requested_by_name' => $requestedByName,
                    'zone_leader_name' => $c->zoneLeader?->resident?->full_name
                        ?? $c->zoneLeader?->email,
                ];
            });

            return $this->respondSuccess(
                $data,
                'Pending confirmations retrieved successfully'
            );
        } catch (\Exception $e) {
            Log::error('❌ pendingConfirmations() error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return $this->respondError(
                'Failed to get pending confirmations: ' . $e->getMessage(),
                null,
                500
            );
        }
    }

    /**
     * ✅ Confirm a resident confirmation request.
     */
    public function confirmConfirmation($id)
    {
        try {
            $confirmation = ResidentConfirmation::find($id);

            if (!$confirmation) {
                return $this->respondNotFound('Confirmation not found');
            }

            if ($confirmation->status !== 'pending') {
                return $this->respondError(
                    'This confirmation request is already processed',
                    null,
                    422
                );
            }

            $confirmation->update([
                'status' => 'confirmed',
                'confirmed_at' => now(),
            ]);

            // Notify requester
            try {
                $resident = Resident::find($confirmation->resident_id);
                $residentName = $resident
                    ? trim($resident->first_name . ' ' . $resident->last_name)
                    : 'Resident';

                if ($confirmation->requested_by_user_id) {
                    $this->notifyUser(
                        $confirmation->requested_by_user_id,
                        '✅ Resident Confirmed',
                        "The resident {$residentName} has been confirmed by the Zone Leader.",
                        'confirmation',
                        'normal',
                        '/residents/confirmations/' . $confirmation->id,
                        Auth::id(),
                        'resident_confirmation',
                        $confirmation->id
                    );
                }
            } catch (\Exception $e) {
                Log::error('Confirm notify error: ' . $e->getMessage());
            }

            return $this->respondSuccess(
                $confirmation->load(['resident', 'requestedBy', 'zoneLeader']),
                'Resident confirmed successfully'
            );
        } catch (\Exception $e) {
            Log::error('confirmConfirmation error: ' . $e->getMessage());
            return $this->respondError(
                'Failed to confirm resident: ' . $e->getMessage(),
                null,
                500
            );
        }
    }

    /**
     * ✅ Reject a resident confirmation request.
     */
    public function rejectConfirmation(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:500',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $confirmation = ResidentConfirmation::find($id);

            if (!$confirmation) {
                return $this->respondNotFound('Confirmation not found');
            }

            if ($confirmation->status !== 'pending') {
                return $this->respondError(
                    'This confirmation request is already processed',
                    null,
                    422
                );
            }

            $confirmation->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejection_reason' => $request->reason,
            ]);

            try {
                $resident = Resident::find($confirmation->resident_id);
                $residentName = $resident
                    ? trim($resident->first_name . ' ' . $resident->last_name)
                    : 'Resident';

                if ($confirmation->requested_by_user_id) {
                    $this->notifyUser(
                        $confirmation->requested_by_user_id,
                        '❌ Resident Confirmation Rejected',
                        "The resident {$residentName} was rejected. Reason: {$request->reason}",
                        'confirmation',
                        'high',
                        '/residents/confirmations/' . $confirmation->id,
                        Auth::id(),
                        'resident_confirmation',
                        $confirmation->id
                    );
                }
            } catch (\Exception $e) {
                Log::error('Reject notify error: ' . $e->getMessage());
            }

            return $this->respondSuccess(
                $confirmation,
                'Resident rejected'
            );
        } catch (\Exception $e) {
            Log::error('rejectConfirmation error: ' . $e->getMessage());
            return $this->respondError(
                'Failed to reject resident: ' . $e->getMessage(),
                null,
                500
            );
        }
    }
}
