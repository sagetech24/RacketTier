<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminMemberAuditRequest extends FormRequest
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
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function sportId(): ?int
    {
        $value = $this->validated('sport_id');

        return $value !== null ? (int) $value : null;
    }

    public function limit(): int
    {
        return (int) ($this->validated('limit') ?? 50);
    }
}
