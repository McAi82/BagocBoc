<?php

namespace App\Http\Controllers\Mobile\Certificates;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class CertificateDownloadController extends Controller
{
    /**
     * ✅ One-time download endpoint.
     * Consumes the token after a successful download.
     */
    public function download($token)
    {
        // Reject obviously bad tokens
        if (!$token || strlen($token) !== 64 || !ctype_xdigit($token)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid download token.',
            ], 400);
        }

        $certification = Certification::where('download_token', $token)->first();

        if (!$certification) {
            // The token was already used, or never existed
            return response()->json([
                'success' => false,
                'message' => 'This download link is invalid or has already been used. ' .
                             'Each certificate can only be downloaded once. ' .
                             'Please contact the barangay office if you need a new copy.',
                'code' => 'TOKEN_ALREADY_USED',
            ], 410); // Gone
        }

        // Check the token hasn't expired
        if ($certification->download_token_expires_at
            && $certification->download_token_expires_at->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'This download link has expired. Please contact the barangay office.',
                'code' => 'TOKEN_EXPIRED',
            ], 410);
        }

        // Already downloaded?
        if ($certification->downloaded_at) {
            return response()->json([
                'success' => false,
                'message' => 'This certificate has already been downloaded.',
                'code' => 'ALREADY_DOWNLOADED',
            ], 410);
        }

        // The actual file
        if (!$certification->document_path) {
            return response()->json([
                'success' => false,
                'message' => 'The certificate file is not available.',
            ], 404);
        }

        $filePath = storage_path('app/public/' . $certification->document_path);

        if (!file_exists($filePath)) {
            Log::warning('Certificate PDF missing on disk', [
                'certification_id' => $certification->id,
                'path' => $certification->document_path,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'The certificate file could not be found on the server.',
            ], 404);
        }

        // ✅ Mark as downloaded BEFORE streaming — guarantees one-time use
        // even if the connection is interrupted mid-download.
        $certification->markAsDownloaded();

        Log::info('Certificate downloaded (one-time)', [
            'certification_id' => $certification->id,
            'reference_number' => $certification->reference_number,
            'downloaded_at' => now(),
        ]);

        $filename = $certification->document_name
            ?? ('certificate_' . $certification->reference_number . '.pdf');

        return response()->download(
            $filePath,
            $filename,
            [
                'Content-Type' => 'application/pdf',
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
                'Pragma' => 'no-cache',
            ]
        );
    }
}