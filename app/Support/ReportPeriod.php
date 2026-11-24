<?php
// app/Support/ReportPeriod.php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Turns the report period chosen in the BNS reports page into real dates.
 *
 * Request fields:
 *   period   monthly | quarterly | yearly   (default: monthly)
 *   year     e.g. 2026                      (default: current year)
 *   month    1-12   (monthly)               (default: current month)
 *   quarter  1-4    (quarterly)             (default: current quarter)
 *
 * from / to  = first and last day of the period.
 * asOf       = to, but never later than today (a running month/quarter/year
 *              is reported up to today).
 */
class ReportPeriod
{
    public const MONTHLY   = 'monthly';
    public const QUARTERLY = 'quarterly';
    public const YEARLY    = 'yearly';

    private const MONTH_NAMES = [
        1 => 'January',
        2 => 'February',
        3 => 'March',
        4 => 'April',
        5 => 'May',
        6 => 'June',
        7 => 'July',
        8 => 'August',
        9 => 'September',
        10 => 'October',
        11 => 'November',
        12 => 'December',
    ];

    public function __construct(
        public readonly string $type,
        public readonly int $year,
        public readonly ?int $month,
        public readonly ?int $quarter,
        public readonly Carbon $from,
        public readonly Carbon $to,
        public readonly Carbon $asOf,
        public readonly string $label,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $now  = now();
        $type = in_array($request->input('period'), [self::MONTHLY, self::QUARTERLY, self::YEARLY], true)
            ? $request->input('period')
            : self::MONTHLY;

        $year = (int) $request->input('year', $now->year);
        if ($year < 2000 || $year > 2100) {
            $year = $now->year;
        }

        $month = $quarter = null;

        if ($type === self::MONTHLY) {
            $month = (int) $request->input('month', $now->month);
            if ($month < 1 || $month > 12) $month = $now->month;

            $from  = Carbon::create($year, $month, 1)->startOfDay();
            $to    = $from->copy()->endOfMonth();
            $label = self::MONTH_NAMES[$month] . ' ' . $year;
        } elseif ($type === self::QUARTERLY) {
            $quarter = (int) $request->input('quarter', $now->quarter);
            if ($quarter < 1 || $quarter > 4) $quarter = $now->quarter;

            $from  = Carbon::create($year, ($quarter - 1) * 3 + 1, 1)->startOfDay();
            $to    = $from->copy()->addMonths(2)->endOfMonth();
            $label = 'Q' . $quarter . ' ' . $year;
        } else {
            $from  = Carbon::create($year, 1, 1)->startOfDay();
            $to    = Carbon::create($year, 12, 31)->endOfDay();
            $label = (string) $year;
        }

        $asOf = $to->greaterThan($now) ? $now->copy() : $to->copy();

        return new self($type, $year, $month, $quarter, $from, $to, $asOf, $label);
    }

    public function dateRange(): array
    {
        return ['from' => $this->from->toDateString(), 'to' => $this->to->toDateString()];
    }

    public function toArray(): array
    {
        return [
            'type'    => $this->type,
            'label'   => $this->label,
            'year'    => $this->year,
            'month'   => $this->month,
            'quarter' => $this->quarter,
        ];
    }
}
