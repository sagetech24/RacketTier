<?php

namespace App\Services;

class EloCalculator
{
    public function __construct(
        private int $kFactor = 32,
    ) {}

    public function expected(float $ratingSelf, float $ratingOpp): float
    {
        return 1.0 / (1.0 + 10.0 ** (($ratingOpp - $ratingSelf) / 400.0));
    }

    /**
     * @param  0.0|1.0  $score  Actual score for the self player (1 win, 0 loss).
     */
    public function delta(float $ratingSelf, float $ratingOpp, float $score): int
    {
        $expected = $this->expected($ratingSelf, $ratingOpp);

        return (int) round($this->kFactor * ($score - $expected));
    }
}
