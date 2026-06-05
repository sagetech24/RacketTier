<?php

namespace App\Http\Requests;

use App\Models\GameSession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreQueueingSessionPlayerRequest extends FormRequest
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
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'guest_name' => ['nullable', 'string', 'max:191'],
            'pronoun' => ['nullable', 'string', 'in:He/Him,She/Her,They/Them,Other'],
            'skill_level' => ['required', 'integer', 'min:1', 'max:5'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $uid = $this->input('user_id');
            $guest = $this->input('guest_name');

            $hasUser = $uid !== null && $uid !== '';
            $hasGuest = $guest !== null && trim((string) $guest) !== '';

            if ($hasUser === $hasGuest) {
                $validator->errors()->add('user_id', 'Provide exactly one of user_id or guest_name.');
            }
        });
    }
}
