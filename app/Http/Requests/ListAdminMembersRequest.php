<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ListAdminMembersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        $page = $this->query('page');
        if ($page !== null && $page !== '') {
            $merge['page'] = (int) $page;
        }

        $perPage = $this->query('per_page');
        if ($perPage !== null && $perPage !== '') {
            $merge['per_page'] = (int) $perPage;
        }

        $q = $this->query('q');
        if ($q !== null) {
            $merge['q'] = trim((string) $q);
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'q' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }

    public function perPage(): int
    {
        return (int) ($this->validated('per_page') ?? 20);
    }

    public function searchQuery(): string
    {
        return trim((string) ($this->validated('q') ?? ''));
    }
}
