<?php

namespace App\Http\Controllers\Web\Households;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\HouseholdAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class HouseholdController extends Controller
{
    /**
     * List all households
     */
    public function index(Request $request)
    {
        $query = Household::with(['address', 'residents']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('household_number', 'LIKE', "%{$search}%")
                    ->orWhere('household_tracking_number', 'LIKE', "%{$search}%");
            });
        }

        $households = $query->latest()->paginate(50);

        return $this->respondSuccess($households);
    }

    /**
     * Show household
     */
    public function show($id)
    {
        $household = Household::with(['address', 'residents', 'censusRecords'])->find($id);

        if (!$household) {
            return $this->respondNotFound('Household not found');
        }

        return $this->respondSuccess($household);
    }

    /**
     * Store new household
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'zone' => 'required|exists:barangay_zones,id',
            'street' => 'required|string|max:255',
            'subdivision' => 'nullable|string|max:255',
            'household_number' => 'required|string|unique:households',
            'household_tracking_number' => 'required|string|unique:households',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $address = HouseholdAddress::create([
            'zone' => $request->zone,
            'street' => $request->street,
            'subdivision' => $request->subdivision,
        ]);

        $household = Household::create([
            'address_id' => $address->id,
            'household_number' => $request->household_number,
            'household_tracking_number' => $request->household_tracking_number,
        ]);

        return $this->respondSuccess($household->load('address'), 'Household created successfully', 201);
    }

    /**
     * Update household
     */
    public function update(Request $request, $id)
    {
        $household = Household::find($id);

        if (!$household) {
            return $this->respondNotFound('Household not found');
        }

        $validator = Validator::make($request->all(), [
            'zone' => 'sometimes|exists:barangay_zones,id',
            'street' => 'sometimes|string|max:255',
            'subdivision' => 'nullable|string|max:255',
            'household_number' => 'sometimes|string|unique:households,household_number,' . $id,
            'household_tracking_number' => 'sometimes|string|unique:households,household_tracking_number,' . $id,
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        if ($request->has('zone') || $request->has('street') || $request->has('subdivision')) {
            $household->address->update($request->only(['zone', 'street', 'subdivision']));
        }

        $household->update($request->only(['household_number', 'household_tracking_number']));

        return $this->respondSuccess($household->load('address'), 'Household updated successfully');
    }

    /**
     * Delete household
     */
    public function destroy($id)
    {
        $household = Household::find($id);

        if (!$household) {
            return $this->respondNotFound('Household not found');
        }

        $household->delete();

        return $this->respondSuccess(null, 'Household deleted successfully');
    }
}