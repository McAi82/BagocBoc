<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    protected function respondSuccess($data = null, $message = 'Success', $status = 200)
    {
        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => $data
        ], $status);
    }

    protected function respondError($message = 'Error', $errors = null, $status = 422)
    {
        return response()->json([
            'status' => 'error',
            'message' => $message,
            'errors' => $errors
        ], $status);
    }

    protected function respondUnauthorized($message = 'Unauthorized')
    {
        return response()->json([
            'status' => 'error',
            'message' => $message
        ], 401);
    }

    protected function respondForbidden($message = 'Forbidden')
    {
        return response()->json([
            'status' => 'error',
            'message' => $message
        ], 403);
    }

    protected function respondNotFound($message = 'Resource not found')
    {
        return response()->json([
            'status' => 'error',
            'message' => $message
        ], 404);
    }
}