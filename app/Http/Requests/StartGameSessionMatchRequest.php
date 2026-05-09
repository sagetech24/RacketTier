<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StartGameSessionMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');

        if (! $user || ! $session instanceof GameSession) {
            return false;
        }

        return (int) $session->created_by === (int) $user->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'facility_id' => ['sometimes', 'integer', 'exists:facilities,id'],
            'lineup' => ['sometimes', 'array'],
            'lineup.*.id' => ['required_with:lineup', 'integer', 'exists:game_session_players,id'],
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
            $fid = $this->input('facility_id');
            if ($fid !== null && $fid !== '' && $session->facility_id !== null && (int) $fid !== (int) $session->facility_id) {
                $validator->errors()->add('facility_id', 'Session does not belong to this facility.');
            }

            $lineup = $this->input('lineup');
            if (! is_array($lineup) || $lineup === []) {
                return;
            }

            if (! $session->isQueueing()) {
                $validator->errors()->add('lineup', 'Manual lineup is only supported for queueing sessions.');

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
