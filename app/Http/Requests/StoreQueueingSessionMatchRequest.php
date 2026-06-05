<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreQueueingSessionMatchRequest extends FormRequest
{
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
        return [
            'lineup' => ['required', 'array'],
            'lineup.*.id' => ['required', 'integer', 'exists:game_session_players,id'],
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

            $lineup = $this->input('lineup');
            if (! is_array($lineup)) {
                return;
            }

            foreach ($lineup as $row) {
                $pid = (int) ($row['id'] ?? 0);
                if ($pid <= 0) {
                    continue;
                }
                $exists = GameSessionPlayer::query()
                    ->whereKey($pid)
                    ->where('game_session_id', $session->id)
                    ->exists();
                if (! $exists) {
                    $validator->errors()->add('lineup', 'Each lineup player must belong to this session.');
                    break;
                }
            }
        });
    }
}
