<?php

namespace App\Http\Requests;

use App\Models\Facility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreFacilityRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:160'],
            'address' => ['required', 'string', 'max:512'],
            'cover_photo' => ['nullable', 'string', 'max:2048'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $name = trim((string) $this->input('name', ''));
        $address = trim((string) $this->input('address', ''));
        $coverPhoto = trim((string) $this->input('cover_photo', ''));

        $this->merge([
            'name' => preg_replace('/\s+/', ' ', $name) ?? $name,
            'address' => preg_replace('/\s+/', ' ', $address) ?? $address,
            'cover_photo' => $coverPhoto === '' ? null : $coverPhoto,
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $name = mb_strtolower((string) $this->input('name', ''));
            $address = mb_strtolower((string) $this->input('address', ''));

            if ($name === '' || $address === '') {
                return;
            }

            $exists = Facility::query()
                ->whereRaw('LOWER(name) = ?', [$name])
                ->whereRaw('LOWER(address) = ?', [$address])
                ->exists();

            if ($exists) {
                $validator->errors()->add('name', 'A facility with this name and address already exists.');
            }
        });
    }
}
