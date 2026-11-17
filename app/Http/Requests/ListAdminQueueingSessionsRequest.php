<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ListAdminQueueingSessionsRequest extends FormRequest
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
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'status' => ['sometimes', 'nullable', 'string', 'in:active,ended'],
            'sport_id' => ['sometimes', 'nullable', 'integer', 'exists:sports,id'],
            'q' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }

    public function perPage(): int
    {
        return (int) ($this->validated('per_page') ?? 20);
    }

    public function statusFilter(): ?string
    {
        $status = $this->validated('status');

        return is_string($status) && $status !== '' ? $status : null;
    }

    public function sportId(): ?int
    {
        $value = $this->validated('sport_id');

        return $value !== null ? (int) $value : null;
    }

    public function searchQuery(): ?string
    {
        $q = $this->validated('q');

        return is_string($q) ? trim($q) : null;
    }
}
