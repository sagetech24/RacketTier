<?php

namespace App\Http\Requests;

use App\Models\GameSession;
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

        return (int) $session->created_by === (int) $user->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'facility_id' => ['sometimes', 'integer', 'exists:facilities,id'],
            'team1_score' => ['required', 'integer', 'min:0', 'max:999'],
            'team2_score' => ['required', 'integer', 'min:0', 'max:999'],
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
            if ($fid !== null && $fid !== '' && (int) $fid !== (int) $session->facility_id) {
                $validator->errors()->add('facility_id', 'Session does not belong to this facility.');
            }
        });
    }
}
