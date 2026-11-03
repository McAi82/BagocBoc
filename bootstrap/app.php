<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use App\Http\Middleware\WebAccess;
use App\Http\Middleware\MobileAccess;
use App\Http\Middleware\CheckRole;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Web API Routes - /api/web/...
            Route::middleware('api')
                ->prefix('api/web')
                ->group(base_path('routes/api-web.php'));

            // Mobile API Routes - /api/mobile/...
            Route::middleware('api')
                ->prefix('api/mobile')
                ->group(base_path('routes/api-mobile.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'web.access' => WebAccess::class,
            'mobile.access' => MobileAccess::class,
            'role' => CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
