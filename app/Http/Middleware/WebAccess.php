<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class WebAccess
{
    protected $webAccessibleRoles = [
            'Super Admin',
            'Barangay Captain',
            'Barangay Secretary',
            'Front Desk Clerk',
            'Barangay Treasurer',
            'Midwife',
            'Nurse Deployment Program',
            'Barangay Nutrition Scholar',
    ];

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized'
            ], 401);
        }

        $userRoles = $user->roles()->pluck('name')->toArray();
        $hasWebAccess = !empty(array_intersect($userRoles, $this->webAccessibleRoles));

        if (!$hasWebAccess) {
            return response()->json([
                'status' => 'error',
                'message' => 'This account does not have web access. Please use the mobile application.',
                'access_denied' => true
            ], 403);
        }

        return $next($request);
    }
}