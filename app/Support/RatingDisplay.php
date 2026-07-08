<?php

namespace App\Support;

class RatingDisplay
{
    /**
     * Convert stored ELO (e.g. 1050) to display rating (e.g. 10.50).
     */
    public static function format(int|float|null $rating): string
    {
        if ($rating === null) {
            return '0.00';
        }

        return number_format($rating / 100, 2, '.', ',');
    }

    /**
     * Convert stored ELO delta (e.g. +16) to display change (e.g. +0.16).
     */
    public static function formatChange(int|float|null $change): string
    {
        if ($change === null) {
            return '0.00';
        }

        $scaled = $change / 100;
        $formatted = number_format(abs($scaled), 2, '.', ',');

        if ($scaled > 0) {
            return '+'.$formatted;
        }

        if ($scaled < 0) {
            return '-'.$formatted;
        }

        return $formatted;
    }
}
