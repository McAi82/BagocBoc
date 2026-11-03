<?php
// app/Http/Controllers/Mobile/QR/QRController.php

namespace App\Http\Controllers\Mobile\QR;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\HouseGeotag;
use App\Models\BarangayInfo;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class QRController extends Controller
{
    use SendsNotifications;

    // ============================================
    // GENERATE
    // ============================================

    public function generate($householdId)
    {
        try {
            $household = Household::with([
                'address.barangayZone',
                'residents',
                'censusRecords' => function ($q) {
                    $q->latest()->limit(1);
                },
            ])->find($householdId);

            if (!$household) {
                return $this->respondNotFound('Household not found');
            }

            $qrData = $this->generateQRData($household);
            $qrCode = $this->generateQRCodeImage($qrData);
            $this->saveQRCode($household, $qrCode, $qrData);

            return $this->respondSuccess([
                'household_id' => $household->id,
                'household_number' => $household->household_number,
                'qr_code' => $qrCode,
                'qr_data' => $qrData,
                'qr_url' => url("/api/mobile/qr/household/{$household->id}"),
            ], 'QR Code generated successfully');
        } catch (\Exception $e) {
            Log::error('QR Code generation error: ' . $e->getMessage());
            return $this->respondError('Failed to generate QR code: ' . $e->getMessage(), null, 500);
        }
    }

    public function getByHousehold($householdId)
    {
        try {
            $household = Household::with([
                'address.barangayZone',
                'residents',
                'censusRecords' => function ($q) {
                    $q->latest()->limit(1);
                },
            ])->find($householdId);

            if (!$household) {
                return $this->respondNotFound('Household not found');
            }

            $geotag = HouseGeotag::where('household_id', $householdId)->first();

            if ($geotag && $geotag->qr_code) {
                return $this->respondSuccess([
                    'household_id' => $household->id,
                    'household_number' => $household->household_number,
                    'qr_code' => $geotag->qr_code,
                    'qr_data' => json_decode($geotag->qr_data, true) ?? $this->generateQRData($household),
                ], 'QR Code retrieved successfully');
            }

            return $this->generate($householdId);
        } catch (\Exception $e) {
            Log::error('Get QR Code error: ' . $e->getMessage());
            return $this->respondError('Failed to get QR code: ' . $e->getMessage(), null, 500);
        }
    }

    public function print($householdId)
    {
        try {
            $household = Household::with([
                'address.barangayZone',
                'residents',
                'censusRecords' => function ($q) {
                    $q->latest()->limit(1);
                },
            ])->find($householdId);

            if (!$household) {
                return $this->respondNotFound('Household not found');
            }

            $qrData = $this->generateQRData($household);
            $qrCode = $this->generateQRCodeImage($qrData);

            return $this->respondSuccess([
                'household_id' => $household->id,
                'household_number' => $household->household_number,
                'qr_code' => $qrCode,
                'qr_data' => $qrData,
                'print_data' => $this->buildPrintData($household),
            ], 'QR Code ready for printing');
        } catch (\Exception $e) {
            Log::error('QR Code print error: ' . $e->getMessage());
            return $this->respondError('Failed to prepare QR code for printing: ' . $e->getMessage(), null, 500);
        }
    }

    public function stats()
    {
        try {
            $totalHouseholds = Household::count();
            $geotagged = HouseGeotag::whereNotNull('qr_code')->count();

            return $this->respondSuccess([
                'total_households' => $totalHouseholds,
                'qr_generated' => $geotagged,
                'pending' => $totalHouseholds - $geotagged,
                'coverage' => $totalHouseholds > 0 ? round(($geotagged / $totalHouseholds) * 100) : 0,
            ], 'QR statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->respondError('Failed to get QR statistics', null, 500);
        }
    }

    public function bulkGenerate(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'zone_id' => 'nullable|exists:barangay_zones,id',
                'limit' => 'nullable|integer|min:1|max:200',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $query = Household::with([
                'address.barangayZone',
                'residents',
                'censusRecords' => function ($q) {
                    $q->latest()->limit(1);
                },
            ]);

            if ($request->has('zone_id')) {
                $query->whereHas('address', function ($q) use ($request) {
                    $q->where('zone', $request->zone_id);
                });
            }

            $households = $query->limit($request->limit ?? 50)->get();
            $generated = 0;

            foreach ($households as $household) {
                $qrData = $this->generateQRData($household);
                $qrCode = $this->generateQRCodeImage($qrData);
                $this->saveQRCode($household, $qrCode, $qrData);
                $generated++;
            }

            return $this->respondSuccess([
                'total_processed' => $households->count(),
                'generated' => $generated,
                'message' => "Generated QR codes for {$generated} households",
            ], 'Bulk QR generation completed');
        } catch (\Exception $e) {
            return $this->respondError('Failed to bulk generate QR codes: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // VALIDATE — accepts old + new payloads
    // ============================================

    public function validateQR(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'qr_data' => 'required|string',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $raw = $request->qr_data;

            Log::info('QR validate raw input', [
                'length' => strlen($raw),
                'preview' => substr($raw, 0, 300),
            ]);

            $decoded = $this->decodeQrPayload($raw);

            if (!$decoded) {
                return $this->respondError(
                    'Invalid QR code data — could not decode',
                    null,
                    422
                );
            }

            // Resolve household by ID first
            $householdId = $this->extractHouseholdId($decoded);
            $household = null;

            if ($householdId) {
                $household = Household::with([
                    'address.barangayZone',
                    'residents',
                    'censusRecords' => function ($q) {
                        $q->latest()->limit(1);
                    },
                    'censusRecords.householdEnvironment',
                    'geotag',
                ])->find($householdId);
            }

            // Fallback: resolve by household_number or tracking_number
            if (!$household) {
                $number = $this->extractHouseholdNumber($decoded);

                if ($number) {
                    $household = Household::with([
                        'address.barangayZone',
                        'residents',
                        'censusRecords' => function ($q) {
                            $q->latest()->limit(1);
                        },
                        'censusRecords.householdEnvironment',
                        'geotag',
                    ])
                        ->where(function ($q) use ($number) {
                            $q->where('household_number', $number)
                                ->orWhere('household_tracking_number', $number);
                        })
                        ->first();
                }
            }

            if (!$household) {
                return $this->respondNotFound('Household not found for this QR code');
            }

            return $this->respondSuccess([
                'valid' => true,
                'household' => $this->buildScanDisplay($household),
                'qr_data' => $decoded,
            ], 'QR code validated successfully');
        } catch (\Exception $e) {
            Log::error('QR validation error: ' . $e->getMessage());
            return $this->respondError('Failed to validate QR code: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private function decodeQrPayload(string $raw): ?array
    {
        $raw = trim($raw);

        if (strlen($raw) >= 2 && $raw[0] === '"' && $raw[strlen($raw) - 1] === '"') {
            $raw = substr($raw, 1, -1);
            $raw = trim($raw);
        }

        $decoded = json_decode($raw, true);

        if (is_array($decoded)) {
            if (isset($decoded['data']) && is_array($decoded['data'])) {
                return $decoded['data'];
            }
            if (isset($decoded['payload']) && is_array($decoded['payload'])) {
                return $decoded['payload'];
            }
            if (isset($decoded['data']) && is_string($decoded['data'])) {
                $inner = json_decode($decoded['data'], true);
                if (is_array($inner)) return $inner;
            }
            return $decoded;
        }

        if (strlen($raw) > 0) {
            return ['household_number' => $raw];
        }

        return null;
    }

    private function extractHouseholdId(array $decoded): ?int
    {
        foreach (['id', 'household_id', 'householdId', 'hh_id'] as $key) {
            if (!empty($decoded[$key]) && is_numeric($decoded[$key])) {
                return (int) $decoded[$key];
            }
        }
        return null;
    }

    private function extractHouseholdNumber(array $decoded): ?string
    {
        foreach (['hn', 'household_number', 'h', 'tn', 'tracking_number', 't'] as $key) {
            if (!empty($decoded[$key]) && is_string($decoded[$key])) {
                return trim($decoded[$key]);
            }
        }
        return null;
    }


    /**
     * ✅ DETAILED payload — self-describing for scans outside the app.
     */
    private function generateQRData($household): array
    {
        $primaryResident = $household->residents->first(function ($r) {
            return $r->pivot->is_primary ?? false;
        });

        return [
            'v' => 2,
            'id' => $household->id,
            'hn' => $household->household_number,
            'h' => $primaryResident
                ? substr(trim($primaryResident->first_name . ' ' . $primaryResident->last_name), 0, 26)
                : 'N/A',
            'p' => substr($household->address->street ?? 'N/A', 0, 22),
            'z' => substr($household->address->barangayZone->name ?? 'N/A', 0, 22),
        ];
    }

    /**
     * ✅ RICH display object — what the scan screen renders.
     */
    private function buildScanDisplay(Household $household): array
    {
        $primaryResident = $household->residents->first(function ($r) {
            return $r->pivot->is_primary ?? false;
        });

        $census = $household->censusRecords->first();

        $members = $household->residents->map(function ($r) {
            $age = null;
            if ($r->birth_date) {
                try {
                    $age = \Carbon\Carbon::parse($r->birth_date)->age;
                } catch (\Exception $e) {
                    $age = null;
                }
            }

            return [
                'id' => $r->id,
                'name' => trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')),
                'first_name' => $r->first_name,
                'last_name' => $r->last_name,
                'gender' => $r->gender,
                'age' => $age,
                'birth_date' => $r->birth_date,
                'relationship' => $r->pivot->relationship_to_household ?? 'N/A',
                'is_primary' => (bool) ($r->pivot->is_primary ?? false),
                'civil_status' => $r->civil_status,
                'occupation' => $r->occupation,
            ];
        })->values()->toArray();

        return [
            'id' => $household->id,
            'household_number' => $household->household_number,
            'tracking_number' => $household->household_tracking_number,
            'status' => $household->status ?? 'active',
            'address' => [
                'street' => $household->address->street ?? 'N/A',
                'subdivision' => $household->address->subdivision ?? null,
                'zone' => $household->address->barangayZone->name ?? 'N/A',
            ],
            'head_of_family' => $primaryResident
                ? trim($primaryResident->first_name . ' ' . $primaryResident->last_name)
                : 'N/A',
            'total_members' => count($members),
            'members' => $members,
            'census' => $census ? [
                'year' => $census->census_year,
                'date' => $census->census_date,
                'monthly_income' => $census->monthly_income,
                'data_status' => $census->data_status,
                'toilet_type' => $census->householdEnvironment->toilet_type ?? null,
                'water_source' => $census->householdEnvironment->water_source ?? null,
                'garbage_disposal' => $census->householdEnvironment->garbage_disposal ?? null,
            ] : null,
            'geotag' => $household->geotag ? [
                'latitude' => (float) $household->geotag->latitude,
                'longitude' => (float) $household->geotag->longitude,
            ] : null,
        ];
    }

    private function buildPrintData(Household $household): array
    {
        $primaryResident = $household->residents->first(function ($r) {
            return $r->pivot->is_primary ?? false;
        });

        return [
            'household_number' => $household->household_number,
            'tracking_number' => $household->household_tracking_number,
            'address' => $this->formatAddress($household),
            'head_of_family' => $primaryResident
                ? trim($primaryResident->first_name . ' ' . $primaryResident->last_name)
                : 'N/A',
            'members' => $household->residents->map(function ($resident) {
                return [
                    'name' => trim($resident->first_name . ' ' . $resident->last_name),
                    'relationship' => $resident->pivot->relationship_to_household ?? 'N/A',
                    'is_primary' => (bool) ($resident->pivot->is_primary ?? false),
                ];
            }),
        ];
    }

    private function generateQRCodeImage(array $data): string
    {
        $jsonData = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $qrCode = QrCode::format('png')
            ->size(700)                 // ✅ big source for crisp downscale
            ->errorCorrection('M')      // ✅ 15% recovery, forgiving at angles
            ->margin(0)                 // ✅ zero margin — the label has its own padding
            ->generate($jsonData);

        return base64_encode($qrCode);
    }

    private function saveQRCode(Household $household, string $qrCode, array $qrData): void
    {
        try {
            HouseGeotag::updateOrCreate(
                ['household_id' => $household->id],
                [
                    'qr_code' => $qrCode,
                    'qr_data' => json_encode($qrData),
                    'qr_generated_at' => now(),
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to save QR code: ' . $e->getMessage());
        }
    }

    private function formatAddress($household): string
    {
        $parts = [];
        if ($household->address) {
            if ($household->address->street) $parts[] = $household->address->street;
            if ($household->address->subdivision) $parts[] = $household->address->subdivision;
            if ($household->address->barangayZone) $parts[] = $household->address->barangayZone->name;
        }
        return implode(', ', $parts) ?: 'N/A';
    }
}
