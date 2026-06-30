<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesQueueingSessionLineup;
use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateQueueingSessionMatchRequest extends FormRequest
{
    use ValidatesQueueingSessionLineup;

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
            'lineup.*.id' => $this->lineupIdRules($session),
            'lineup.*.team' => ['nullable', 'integer', 'in:1,2'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $session = $this->route('gameSession');
            if (! $session instanceof GameSession) {
                return;
            }

            $this->validateLineupBelongsToSession($validator, $session, $this->input('lineup'));
        });
    }
}
