<?php

namespace App\Http\Controllers\Web\Settings;

use App\Http\Controllers\Controller;
use App\Models\BarangayInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BarangayInfoController extends Controller
{
    /**
     * Get barangay information
     */
    public function index()
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

    /**
     * Update barangay information
     */
    public function update(Request $request)
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