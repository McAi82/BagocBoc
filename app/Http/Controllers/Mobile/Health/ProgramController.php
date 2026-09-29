<?php

namespace App\Http\Controllers\Mobile\Health;

use App\Http\Controllers\Controller;
use App\Models\Program;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ProgramController extends Controller
{
    use SendsNotifications;

    public function index(Request $request)
    {
        $query = Program::withCount('participants');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('program_type', $request->type);
        }

        $programs = $query->latest()->get();
        return $this->respondSuccess($programs);
    }

    /**
     * Create program
     * ✅ Notifies BHWs, BNS, and Residents
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'programs' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'program_type' => 'required|in:nutrition,drug,sexual_health,maternal,other',
            'status' => 'required|in:planned,ongoing,completed,cancelled',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $program = Program::create($request->all());

        // ✅ Notify BHWs, BNS, and Residents if program is active/planned
        if (in_array($request->status, ['planned', 'ongoing'])) {
            $this->notifyRoles(
                ['Barangay Health Worker', 'Barangay Nutrition Scholar', 'Resident'],
                '📢 New Program Announced',
                "A new {$request->program_type} program '{$program->programs}' has been announced. Starts {$request->start_date}.",
                'program',
                $request->status === 'ongoing' ? 'high' : 'normal',
                '/programs/' . $program->id,
                Auth::id()
            );
        }

        return $this->respondSuccess($program, 'Program created successfully', 201);
    }

    public function show($id)
    {
        $program = Program::with(['participants', 'participants.resident'])
            ->find($id);

        if (!$program) {
            return $this->respondNotFound('Program not found');
        }

        return $this->respondSuccess($program);
    }

    /**
     * Update program
     * ✅ Notifies on status change
     */
    public function update(Request $request, $id)
    {
        $program = Program::find($id);

        if (!$program) {
            return $this->respondNotFound('Program not found');
        }

        $validator = Validator::make($request->all(), [
            'programs' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'program_type' => 'sometimes|in:nutrition,drug,sexual_health,maternal,other',
            'status' => 'sometimes|in:planned,ongoing,completed,cancelled',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $previousStatus = $program->status;
        $program->update($request->all());

        // ✅ Notify on meaningful status transitions
        if ($request->filled('status') && $previousStatus !== $request->status) {
            if ($request->status === 'cancelled') {
                $this->notifyRoles(
                    ['Barangay Health Worker', 'Barangay Nutrition Scholar', 'Resident'],
                    '❌ Program Cancelled',
                    "The program '{$program->programs}' has been cancelled.",
                    'program',
                    'high',
                    '/programs/' . $program->id,
                    Auth::id()
                );
            } elseif ($request->status === 'completed') {
                $this->notifyRoles(
                    ['Barangay Health Worker', 'Barangay Nutrition Scholar'],
                    '✅ Program Completed',
                    "The program '{$program->programs}' has been completed.",
                    'program',
                    'normal',
                    '/programs/' . $program->id,
                    Auth::id()
                );
            } elseif ($request->status === 'ongoing') {
                $this->notifyRoles(
                    ['Barangay Health Worker', 'Barangay Nutrition Scholar', 'Resident'],
                    '🚀 Program Now Ongoing',
                    "The program '{$program->programs}' is now ongoing.",
                    'program',
                    'high',
                    '/programs/' . $program->id,
                    Auth::id()
                );
            }
        }

        return $this->respondSuccess($program, 'Program updated successfully');
    }

    public function destroy($id)
    {
        $program = Program::find($id);

        if (!$program) {
            return $this->respondNotFound('Program not found');
        }

        $program->delete();
        return $this->respondSuccess(null, 'Program deleted successfully');
    }
}
