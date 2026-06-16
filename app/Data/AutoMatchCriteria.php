<?php

namespace App\Data;

readonly class AutoMatchCriteria
{
    public const SKILL_MODE_BALANCED = 'balanced';

    public const SKILL_MODE_SAME_LEVEL = 'same_level';

    public function __construct(
        public bool $skillLevel = true,
        public string $skillMatchMode = self::SKILL_MODE_BALANCED,
        public bool $wlStatistics = true,
        public bool $sequence = true,
        public bool $genderlessMixed = true,
        public ?int $refreshSeed = null,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            skillLevel: self::parseBool($validated['skill_level'] ?? true),
            skillMatchMode: self::parseSkillMatchMode($validated['skill_match_mode'] ?? self::SKILL_MODE_BALANCED),
            wlStatistics: self::parseBool($validated['wl_statistics'] ?? true),
            sequence: self::parseBool($validated['sequence'] ?? true),
            genderlessMixed: self::parseBool($validated['genderless_mixed'] ?? true),
            refreshSeed: self::parseRefreshSeed($validated['refresh_seed'] ?? null),
        );
    }

    /**
     * @return array<string, bool|string|int|null>
     */
    public function toArray(): array
    {
        return [
            'skill_level' => $this->skillLevel,
            'skill_match_mode' => $this->skillMatchMode,
            'wl_statistics' => $this->wlStatistics,
            'sequence' => $this->sequence,
            'genderless_mixed' => $this->genderlessMixed,
            'refresh_seed' => $this->refreshSeed,
        ];
    }

    public function isRefresh(): bool
    {
        return $this->refreshSeed !== null && $this->refreshSeed > 0;
    }

    public function usesSkillMatching(): bool
    {
        return $this->skillLevel;
    }

    public function isBalancedSkillMode(): bool
    {
        return $this->skillMatchMode === self::SKILL_MODE_BALANCED;
    }

    private static function parseBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
        }

        return (bool) $value;
    }

    private static function parseSkillMatchMode(mixed $value): string
    {
        $mode = is_string($value) ? strtolower(trim($value)) : self::SKILL_MODE_BALANCED;

        return in_array($mode, [self::SKILL_MODE_BALANCED, self::SKILL_MODE_SAME_LEVEL], true)
            ? $mode
            : self::SKILL_MODE_BALANCED;
    }

    private static function parseRefreshSeed(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $seed = (int) $value;

        return $seed > 0 ? $seed : null;
    }
}
