<?php
// app/Support/HouseholdLink.php

namespace App\Support;

/**
 * Builds and verifies the link printed in a household's QR code.
 *
 *   https://your-site.com/h/12-a1b2c3d4e5f60718
 *                           |  \_ 64-bit signature (HMAC of the id, made with APP_KEY)
 *                           \_ household id
 *
 * The signature makes the link impossible to guess, so nobody can walk through
 * /h/1, /h/2, /h/3 ... to read other households. Nothing is stored in the
 * database and the link never expires, so printed labels keep working.
 *
 * ⚠️ Do NOT change APP_KEY after labels are printed - every printed QR would
 *    stop working.
 */
class HouseholdLink
{
    private const SIGNATURE_LENGTH = 16; // hex characters

    public static function token(int $householdId): string
    {
        return $householdId . '-' . self::signature($householdId);
    }

    public static function url(int $householdId): string
    {
        return url('/h/' . self::token($householdId));
    }

    /** Household id for a valid token, otherwise null. */
    public static function resolve(string $token): ?int
    {
        if (!preg_match('/^(\d{1,12})-([a-f0-9]{' . self::SIGNATURE_LENGTH . '})$/', $token, $m)) {
            return null;
        }

        $id = (int) $m[1];

        return hash_equals(self::signature($id), $m[2]) ? $id : null;
    }

    private static function signature(int $householdId): string
    {
        return substr(
            hash_hmac('sha256', 'household-landing:' . $householdId, (string) config('app.key')),
            0,
            self::SIGNATURE_LENGTH
        );
    }
}
