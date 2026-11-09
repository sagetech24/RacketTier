<?php

namespace App\Services;

/**
 * Queue-master selectable loser point policy for queueing sessions.
 */
final class LossPointMode
{
    public const ZERO = 'zero';

    public const EFFORT = 'effort';

    public const PENALTY = 'penalty';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return [self::ZERO, self::EFFORT, self::PENALTY];
    }

    public static function normalize(?string $mode): string
    {
        $mode = is_string($mode) ? $mode : self::EFFORT;

        return in_array($mode, self::values(), true) ? $mode : self::EFFORT;
    }

    public static function amount(?string $mode): int
    {
        return match (self::normalize($mode)) {
            self::ZERO => 0,
            self::PENALTY => -MatchPointFormula::LOSS,
            default => MatchPointFormula::LOSS,
        };
    }
}
