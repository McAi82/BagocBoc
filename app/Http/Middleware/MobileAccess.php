<?php
// app/Http/Middleware/MobileAccess.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MobileAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        // ✅ 1. Must be authenticated
        if (!auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        $user = auth()->user();

        // ✅ 2. Account must be active
        if ($user->account_status !== 'active') {
            // Revoke all their tokens so a deactivated user can't
            // keep hitting any endpoint with an old bearer token.
            $user->tokens()->delete();

            return response()->json([
                'success' => false,
                'message' => 'Your account is deactivated. Please contact the barangay office.',
            ], 403);
        }

        // ✅ 3. Must have at least one mobile-accessible role
        $mobileRoles = [
            'Barangay Health Worker',
            'Barangay Nutrition Scholar',
            'Zone Leader',
            'Resident',
        ];

        $hasMobileRole = $user->roles()
            ->whereIn('name', $mobileRoles)
            ->exists();

        if (!$hasMobileRole) {
            return response()->json([
                'success' => false,
                'message' => 'Account does not have mobile access',
            ], 403);
        }

        return $next($request);
    }
}
