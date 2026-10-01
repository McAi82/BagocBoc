<?php
// app/Traits/HasCrudResponses.php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait HasCrudResponses
{
    /**
     * Standard success response.
     */
    protected function respondSuccess(
        $data = null,
        string $message = 'Success',
        int $status = 200
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'status'  => 'success',
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    /**
     * Standard error response.
     */
    protected function respondError(
        string $message = 'Error',
        $errors = null,
        int $status = 400
    ): JsonResponse {
        $payload = [
            'success' => false,
            'status'  => 'error',
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }

    /**
     * 404 helper.
     */
    protected function respondNotFound(string $message = 'Resource not found'): JsonResponse
    {
        return $this->respondError($message, null, 404);
    }

    /**
     * 403 helper.
     */
    protected function respondForbidden(string $message = 'Forbidden'): JsonResponse
    {
        return $this->respondError($message, null, 403);
    }
}