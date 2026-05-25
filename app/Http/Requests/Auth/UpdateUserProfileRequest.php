<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class, 'email')->ignore($userId),
            ],
            'age' => ['nullable', 'integer', 'min:1', 'max:150'],
            'pronoun' => ['nullable', 'string', 'in:He/Him,She/Her,They/Them,Other'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $name = trim((string) $this->input('name', ''));
        $email = mb_strtolower(trim((string) $this->input('email', '')));
        $age = $this->input('age');
        $pronoun = trim((string) $this->input('pronoun', ''));

        $this->merge([
            'name' => preg_replace('/\s+/', ' ', $name) ?? $name,
            'email' => $email,
            'age' => $age === '' || $age === null ? null : $age,
            'pronoun' => $pronoun === '' ? null : $pronoun,
        ]);
    }
}
