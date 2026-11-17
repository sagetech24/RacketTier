<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminMemberAdjustRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sport_id' => ['required', 'integer', 'exists:sports,id'],
            'amount' => ['required', 'integer', 'not_in:0', 'between:-5000,5000'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
