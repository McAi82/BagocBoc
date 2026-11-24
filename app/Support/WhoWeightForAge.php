<?php
// app/Support/WhoWeightForAge.php

namespace App\Support;

/**
 * WHO Child Growth Standards — weight-for-age, birth to 24 months.
 *
 * Source: WHO Child Growth Standards, weight-for-age z-score tables (boys and girls,
 * birth to 5 years), months 0-24, weight in kg:
 *   https://www.who.int/tools/child-growth-standards/standards/weight-for-age
 *
 * Each row is indexed by completed months of age and holds the weight at:
 *   [-3 SD, -2 SD, -1 SD, Median, +1 SD, +2 SD, +3 SD]
 *
 * ⚠️ Have the BNS / health office verify these values against the official WHO tables
 * before using the report officially.
 *
 * Classification used by the BNS report (3 groups only):
 *   weight <  -2 SD            => Underweight (includes severely underweight)
 *   -2 SD <= weight <= +2 SD   => Normal
 *   weight >  +2 SD            => Overweight
 */
class WhoWeightForAge
{
    public const UNDERWEIGHT = 'Underweight';
    public const NORMAL      = 'Normal';
    public const OVERWEIGHT  = 'Overweight';

    private const BOYS = [
        0  => [2.1, 2.5, 2.9, 3.3, 3.9, 4.4, 5.0],
        1  => [2.9, 3.4, 3.9, 4.5, 5.1, 5.8, 6.6],
        2  => [3.8, 4.3, 4.9, 5.6, 6.3, 7.1, 8.0],
        3  => [4.4, 5.0, 5.7, 6.4, 7.2, 8.0, 9.0],
        4  => [4.9, 5.6, 6.2, 7.0, 7.8, 8.7, 9.7],
        5  => [5.3, 6.0, 6.7, 7.5, 8.4, 9.3, 10.4],
        6  => [5.7, 6.4, 7.1, 7.9, 8.8, 9.8, 10.9],
        7  => [5.9, 6.7, 7.4, 8.3, 9.2, 10.3, 11.4],
        8  => [6.2, 6.9, 7.7, 8.6, 9.6, 10.7, 11.9],
        9  => [6.4, 7.1, 8.0, 8.9, 9.9, 11.0, 12.3],
        10 => [6.6, 7.4, 8.2, 9.2, 10.2, 11.4, 12.7],
        11 => [6.8, 7.6, 8.4, 9.4, 10.5, 11.7, 13.0],
        12 => [6.9, 7.7, 8.6, 9.6, 10.8, 12.0, 13.3],
        13 => [7.1, 7.9, 8.8, 9.9, 11.0, 12.3, 13.7],
        14 => [7.2, 8.1, 9.0, 10.1, 11.3, 12.6, 14.0],
        15 => [7.4, 8.3, 9.2, 10.3, 11.5, 12.8, 14.3],
        16 => [7.5, 8.4, 9.4, 10.5, 11.7, 13.1, 14.6],
        17 => [7.7, 8.6, 9.6, 10.7, 12.0, 13.4, 14.9],
        18 => [7.8, 8.8, 9.8, 10.9, 12.2, 13.7, 15.3],
        19 => [8.0, 8.9, 10.0, 11.1, 12.5, 13.9, 15.6],
        20 => [8.1, 9.1, 10.1, 11.3, 12.7, 14.2, 15.9],
        21 => [8.2, 9.2, 10.3, 11.5, 12.9, 14.5, 16.2],
        22 => [8.4, 9.4, 10.5, 11.8, 13.2, 14.7, 16.5],
        23 => [8.5, 9.5, 10.7, 12.0, 13.4, 15.0, 16.8],
        24 => [8.6, 9.7, 10.8, 12.2, 13.6, 15.3, 17.1],
    ];

    private const GIRLS = [
        0  => [2.0, 2.4, 2.8, 3.2, 3.7, 4.2, 4.8],
        1  => [2.7, 3.2, 3.6, 4.2, 4.8, 5.5, 6.2],
        2  => [3.4, 3.9, 4.5, 5.1, 5.8, 6.6, 7.5],
        3  => [4.0, 4.5, 5.2, 5.8, 6.6, 7.5, 8.5],
        4  => [4.4, 5.0, 5.7, 6.4, 7.3, 8.2, 9.3],
        5  => [4.8, 5.4, 6.1, 6.9, 7.8, 8.8, 10.0],
        6  => [5.1, 5.7, 6.5, 7.3, 8.2, 9.3, 10.6],
        7  => [5.3, 6.0, 6.8, 7.6, 8.6, 9.8, 11.1],
        8  => [5.6, 6.3, 7.0, 7.9, 9.0, 10.2, 11.6],
        9  => [5.8, 6.5, 7.3, 8.2, 9.3, 10.5, 12.0],
        10 => [5.9, 6.7, 7.5, 8.5, 9.6, 10.9, 12.4],
        11 => [6.1, 6.9, 7.7, 8.7, 9.9, 11.2, 12.8],
        12 => [6.3, 7.0, 7.9, 8.9, 10.1, 11.5, 13.1],
        13 => [6.4, 7.2, 8.1, 9.2, 10.4, 11.8, 13.5],
        14 => [6.6, 7.4, 8.3, 9.4, 10.6, 12.1, 13.8],
        15 => [6.7, 7.6, 8.5, 9.6, 10.9, 12.4, 14.1],
        16 => [6.9, 7.7, 8.7, 9.8, 11.1, 12.6, 14.5],
        17 => [7.0, 7.9, 8.9, 10.0, 11.4, 12.9, 14.8],
        18 => [7.2, 8.1, 9.1, 10.2, 11.6, 13.2, 15.1],
        19 => [7.3, 8.2, 9.2, 10.4, 11.8, 13.5, 15.4],
        20 => [7.5, 8.4, 9.4, 10.6, 12.1, 13.7, 15.7],
        21 => [7.6, 8.6, 9.6, 10.9, 12.3, 14.0, 16.0],
        22 => [7.8, 8.7, 9.8, 11.1, 12.5, 14.3, 16.4],
        23 => [7.9, 8.9, 10.0, 11.3, 12.8, 14.6, 16.7],
        24 => [8.1, 9.0, 10.2, 11.5, 13.0, 14.8, 17.0],
    ];

    /**
     * @param  float       $weightKg   Weight in kilograms
     * @param  int         $ageMonths  Completed months of age at the time of weighing (0-24)
     * @param  string|null $gender     'Male' or 'Female'
     * @return string|null Underweight | Normal | Overweight, or null if it can't be classified
     */
    public static function classify(float $weightKg, int $ageMonths, ?string $gender): ?string
    {
        if ($weightKg <= 0 || $ageMonths < 0 || $ageMonths > 24) {
            return null;
        }

        $table = match (strtolower(trim((string) $gender))) {
            'male'   => self::BOYS,
            'female' => self::GIRLS,
            default  => null,
        };

        if ($table === null || !isset($table[$ageMonths])) {
            return null;
        }

        [, $minus2, , , , $plus2] = $table[$ageMonths];

        if ($weightKg < $minus2) return self::UNDERWEIGHT;
        if ($weightKg > $plus2)  return self::OVERWEIGHT;

        return self::NORMAL;
    }
}