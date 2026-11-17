<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ListAdminTierRanksRequest extends FormRequest
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
            'sport_id' => ['sometimes', 'nullable', 'integer', 'exists:sports,id'],
        ];
    }

    public function sportId(): ?int
    {
        $value = $this->validated('sport_id');

        return $value !== null ? (int) $value : null;
    }
}
