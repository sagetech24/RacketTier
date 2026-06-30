<?php

namespace App\Http\Requests\Concerns;

use App\Data\AutoMatchCriteria;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

trait ValidatesAutoMatchCriteria
{
    /**
     * @return array<string, mixed>
     */
    protected function autoMatchCriteriaRules(): array
    {
        return [
            'skill_level' => ['sometimes', 'boolean'],
            'skill_match_mode' => ['sometimes', 'string', Rule::in([
                AutoMatchCriteria::SKILL_MODE_BALANCED,
                AutoMatchCriteria::SKILL_MODE_SAME_LEVEL,
            ])],
            'wl_statistics' => ['sometimes', 'boolean'],
            'sequence' => ['sometimes', 'boolean'],
            'genderless_mixed' => ['sometimes', 'boolean'],
        ];
    }

    protected function withAutoMatchCriteriaValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->hasAnyAutoMatchCriteriaInput()) {
                return;
            }

            $criteria = AutoMatchCriteria::fromRequest($this->all());
            if (! $criteria->hasAnyCriterion()) {
                $validator->errors()->add(
                    'auto_match_criteria',
                    'Select at least one auto-match criterion.',
                );
            }
        });
    }

    public function hasAnyAutoMatchCriteriaInput(): bool
    {
        return $this->hasAny([
            'skill_level',
            'skill_match_mode',
            'wl_statistics',
            'sequence',
            'genderless_mixed',
        ]);
    }

    public function autoMatchCriteria(): AutoMatchCriteria
    {
        if (! $this->hasAnyAutoMatchCriteriaInput()) {
            return AutoMatchCriteria::defaults();
        }

        return AutoMatchCriteria::fromRequest($this->validated());
    }
}
