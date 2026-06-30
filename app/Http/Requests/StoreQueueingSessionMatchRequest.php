<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesQueueingSessionLineup;
use App\Models\GameSession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreQueueingSessionMatchRequest extends FormRequest
{
    use ValidatesQueueingSessionLineup;

    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');

        if (! $user || ! $session instanceof GameSession) {
            return false;
        }

        return $session->isQueueing() && $session->userCanManage($user);
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
