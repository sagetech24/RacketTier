<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTierRankRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:100'],
            'tier_no' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'start_point' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'end_point' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'status' => ['sometimes', 'boolean'],
        ];
    }
}
