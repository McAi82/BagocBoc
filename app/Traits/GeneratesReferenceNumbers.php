<?php
// app/Traits/GeneratesReferenceNumbers.php

namespace App\Traits;

trait GeneratesReferenceNumbers
{
    /**
     * Generate a unique reference number.
     *
     * @param  string  $prefix  e.g. 'CERT', 'CLR', 'PNL', 'REQ'
     * @param  string  $model   Fully-qualified model class
     * @param  string  $column  Column to check uniqueness (default: reference_number)
     * @param  string  $format  'YEAR-####' | 'YYYYMM-####' | 'YYYYMMDD-####'
     */
    protected function generateReference(
        string $prefix,
        string $model,
        string $column = 'reference_number',
        string $format = 'YEAR-####'
    ): string {
        $random = str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $candidate = $this->buildReference($prefix, $random, $format);

        while ($model::where($column, $candidate)->exists()) {
            $random = str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $candidate = $this->buildReference($prefix, $random, $format);
        }

        return $candidate;
    }

    private function buildReference(string $prefix, string $random, string $format): string
    {
        return match ($format) {
            'YYYYMM-####'   => sprintf('%s-%s-%s', $prefix, date('Ym'), $random),
            'YYYYMMDD-####' => sprintf('%s-%s-%s', $prefix, date('Ymd'), $random),
            default         => sprintf('%s-%s-%s', $prefix, date('Y'), $random),
        };
    }

    /**
     * Generate an account-activation reference like "123 456 789 012".
     */
    protected function generateActivationReference(): string
    {
        return sprintf(
            '%03d %03d %03d %03d',
            random_int(0, 999),
            random_int(0, 999),
            random_int(0, 999),
            random_int(0, 999)
        );
    }
}