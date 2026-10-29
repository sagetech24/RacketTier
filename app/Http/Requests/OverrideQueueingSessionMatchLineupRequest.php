<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class OverrideQueueingSessionMatchLineupRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');
        $match = $this->route('queueingSessionMatch');

        if (! $user || ! $session instanceof GameSession || ! $match instanceof QueueingSessionMatch) {
            return false;
        }

        return $session->isQueueing()
            && $session->userCanManage($user)
            && (int) $match->game_session_id === (int) $session->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var GameSession $session */
        $session = $this->route('gameSession');

        return [
            'lineup' => ['required', 'array'],
            'lineup.*.id' => ['required', 'integer'],
            'lineup.*.team' => ['required', 'integer', 'in:1,2'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            // Finished overrides validate the closed player set in the action
            // (same snapshot ids). Skip live-roster belonging checks so ended
            // sessions and hard-removed players still work.
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $session = $this->route('gameSession');
            if (! $session instanceof GameSession) {
                return;
            }

            $required = $session->match_type === 'doubles' ? 4 : 2;
            $lineup = $this->input('lineup');
            if (! is_array($lineup) || count($lineup) !== $required) {
                $validator->errors()->add('lineup', 'The lineup must match the session match type.');
            }
        });
    }
}
