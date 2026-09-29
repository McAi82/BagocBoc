<?php

namespace App\Http\Controllers\Mobile\Programs;

use App\Http\Controllers\Controller;
use App\Models\Program;
use Illuminate\Http\Request;

class ProgramController extends Controller
{
    /**
     * Get all active programs for residents (view-only, no notifications)
     */
    public function index(Request $request)
    {
        $query = Program::where('status', 'ongoing')
            ->orWhere('status', 'planned')
            ->withCount('participants');

        if ($request->has('type')) {
            $query->where('program_type', $request->type);
        }

        $programs = $query->latest()->get();

        return $this->respondSuccess($programs);
    }

    /**
     * Show program details (view-only, no notifications)
     */
    public function show($id)
    {
        $program = Program::with([
            'participants',
            'participants.resident',
            'participants.nutritionAssessments'
        ])->find($id);

        if (!$program) {
            return $this->respondNotFound('Program not found');
        }

        return $this->respondSuccess($program);
    }
}
