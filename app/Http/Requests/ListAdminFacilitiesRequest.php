<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ListAdminFacilitiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('include_archived')) {
            $this->merge([
                'include_archived' => filter_var($this->input('include_archived'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'q' => ['sometimes', 'nullable', 'string', 'max:100'],
            'include_archived' => ['sometimes', 'boolean'],
        ];
    }

    public function searchQuery(): string
    {
        return trim((string) ($this->validated('q') ?? ''));
    }

    public function includeArchived(): bool
    {
        return (bool) ($this->validated('include_archived') ?? false);
    }
}
