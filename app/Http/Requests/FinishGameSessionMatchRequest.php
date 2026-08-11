<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use App\Services\QueueingSessionDraftStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class FinishGameSessionMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->route('gameSession');

        if (! $user || ! $session instanceof GameSession) {
            return false;
        }

        if ($session->isQueueing()) {
            return $session->userCanManage($user);
        }

        return (int) $session->created_by === (int) $user->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $session = $this->route('gameSession');
        $queueingSkipScores = $session instanceof GameSession
            && $session->isQueueing()
            && (bool) $session->skip_scores;
        $facilityWinnerOnly = $session instanceof GameSession
            && ! $session->isQueueing()
            && $this->filled('winning_team');

        $base = [
            'facility_id' => ['sometimes', 'integer', 'exists:facilities,id'],
            'queueing_session_match_id' => $session instanceof GameSession && $session->isDraft()
                ? ['sometimes', 'integer', 'min:1']
                : ['sometimes', 'integer', 'exists:queueing_session_matches,id'],
        ];

        if ($queueingSkipScores || $facilityWinnerOnly) {
            return array_merge($base, [
                'winning_team' => ['required', 'integer', 'in:1,2'],
                'team1_score' => ['prohibited'],
                'team2_score' => ['prohibited'],
            ]);
        }

        return array_merge($base, [
            'team1_score' => ['required', 'integer', 'min:0', 'max:999'],
            'team2_score' => ['required', 'integer', 'min:0', 'max:999'],
            'winning_team' => ['prohibited'],
        ]);
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

            $matchId = $this->input('queueing_session_match_id');
            if ($session->isDraft() && $matchId !== null && $matchId !== '') {
                $draft = app(QueueingSessionDraftStore::class)->load((int) $session->id);
                if ($draft->findMatch((int) $matchId) === null) {
                    $validator->errors()->add('queueing_session_match_id', 'The selected queueing session match id is invalid.');
                }
            }
        });
    }
}
