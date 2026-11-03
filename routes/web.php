<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| Blade views, the SPA shell, and anything served at the root.
|
| ⚠️ IMPORTANT: Route::fallback runs ONLY when no other route matches,
| including all /api/web/* and /api/mobile/* routes registered in
| bootstrap/app.php. This is why we MUST use fallback() and NOT a
| wildcard Route::get('/{any}') — the wildcard would swallow API calls.
*/

Route::fallback(function () {
    // If someone hits an unmatched /api/* path, return a JSON 404
    // instead of the SPA HTML (so the frontend gets a proper error).
    if (request()->is('api/*')) {
        abort(404);
    }

    // Everything else → serve the React SPA shell
    return view('app');
});
