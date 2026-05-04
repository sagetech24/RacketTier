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
            'facility_id' => ['required', 'integer', 'exists:facilities,id'],
            'sport_slug' => ['required', 'string', 'max:64', 'exists:sports,slug'],
            'match_type' => ['required', 'string', 'in:singles,doubles'],
            'game_type' => ['required', 'string', 'max:64'],
            'court_preference' => ['nullable', 'string', 'max:128'],
            'player_ids' => ['required', 'array'],
            'player_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'team_assignments' => ['required', 'array'],
            'team_assignments.*.user_id' => ['required', 'integer', 'exists:users,id'],
            'team_assignments.*.team' => ['required', 'integer', 'in:1,2'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $user = $this->user();
            if (! $user) {
                return;
            }

            $hostId = (int) $user->id;

            $ids = collect($this->input('player_ids', []))->map(fn ($id) => (int) $id)->unique()->values();
            if ($ids->contains($hostId)) {
                $validator->errors()->add('player_ids', 'Remove yourself from the invite list; you are added automatically as the host.');
            }

            $matchType = (string) $this->input('match_type');
            $expectedInvitees = $matchType === 'doubles' ? 3 : 1;
            if ($ids->count() < $expectedInvitees) {
                $label = $matchType === 'doubles' ? 'doubles' : 'singles';
                $validator->errors()->add(
                    'player_ids',
                    "Select exactly {$expectedInvitees} other player".($expectedInvitees > 1 ? 's' : '')." for {$label}."
                );
            }
            if ($ids->count() > $expectedInvitees) {
                $validator->errors()->add(
                    'player_ids',
                    $matchType === 'doubles'
                        ? 'Doubles allows exactly three other players (four including you).'
                        : 'Singles allows exactly one other player (two including you).'
                );
            }

            $assignments = collect($this->input('team_assignments', []));
            if ($assignments->isEmpty()) {
                return;
            }

            $byUser = $assignments->keyBy(fn ($row) => (int) ($row['user_id'] ?? 0));
            if ($byUser->count() !== $assignments->count()) {
                $validator->errors()->add('team_assignments', 'Each player may only appear once in team assignments.');
            }

            $expectedRoster = $ids->push($hostId)->unique()->sort()->values()->all();
            $assignmentUserIds = $byUser->keys()->map(fn ($id) => (int) $id)->unique()->sort()->values()->all();

            if ($expectedRoster !== $assignmentUserIds) {
                $validator->errors()->add(
                    'team_assignments',
                    'Team assignments must include you and every invited player exactly once.'
                );
            }

            $team1 = $assignments->where('team', 1)->pluck('user_id')->map(fn ($id) => (int) $id);
            $team2 = $assignments->where('team', 2)->pluck('user_id')->map(fn ($id) => (int) $id);

            if ($matchType === 'singles') {
                if ($assignments->count() !== 2 || $team1->count() !== 1 || $team2->count() !== 1) {
                    $validator->errors()->add('team_assignments', 'Singles requires one player on team 1 and one on team 2.');
                }
            } elseif ($matchType === 'doubles') {
                if ($assignments->count() !== 4 || $team1->count() !== 2 || $team2->count() !== 2) {
                    $validator->errors()->add('team_assignments', 'Doubles requires two players on team 1 and two on team 2.');
                }
            }
        });
    }
}
