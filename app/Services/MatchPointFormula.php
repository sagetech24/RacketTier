<?php

namespace App\Services;

/**
 * Platform-owned match rewards. Queue masters do not configure these values.
 */
final class MatchPointFormula
{
    public const WIN_BASE = 25;

    public const WIN_MARGIN_CAP = 10;

    public const LOSS = 8;

    public static function earned(bool $won, int $margin): int
    {
        if ($won) {
            return self::WIN_BASE + min(self::WIN_MARGIN_CAP, max(0, $margin));
        }

        return self::LOSS;
    }

    /**
     * @return array{win_base: int, win_margin_cap: int, loss: int}
     */
    public static function rules(): array
    {
        return [
            'win_base' => self::WIN_BASE,
            'win_margin_cap' => self::WIN_MARGIN_CAP,
            'loss' => self::LOSS,
        ];
    }
}
