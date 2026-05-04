<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreGameSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sport_slug' => ['required', 'string', 'max:64', 'exists:sports,slug'],
            'match_type' => ['required', 'string', 'in:singles,doubles'],
            'game_type' => ['required', 'string', 'max:64'],
            'court_preference' => ['nullable', 'string', 'max:128'],
            'player_ids' => ['required', 'array'],
            'player_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $user = $this->user();
            if (! $user) {
                return;
            }

            $ids = collect($this->input('player_ids', []))->map(fn ($id) => (int) $id)->unique()->values();
            if ($ids->contains((int) $user->id)) {
                $validator->errors()->add('player_ids', 'Remove yourself from the invite list; you are added automatically as the host.');
            }

            $matchType = $this->input('match_type');
            $minInvitees = $matchType === 'doubles' ? 3 : 1;
            if ($ids->count() < $minInvitees) {
                $label = $matchType === 'doubles' ? 'doubles' : 'singles';
                $validator->errors()->add(
                    'player_ids',
                    "Select at least {$minInvitees} other player".($minInvitees > 1 ? 's' : '')." for {$label}."
                );
            }

            $maxInvitees = $matchType === 'doubles' ? 15 : 7;
            if ($ids->count() > $maxInvitees) {
                $validator->errors()->add('player_ids', 'Too many players selected for this match type.');
            }
        });
    }
}
