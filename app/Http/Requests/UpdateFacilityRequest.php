<?php

namespace App\Http\Requests;

use App\Models\Facility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateFacilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'address' => ['required', 'string', 'max:512'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $name = trim((string) $this->input('name', ''));
        $address = trim((string) $this->input('address', ''));

        $this->merge([
            'name' => preg_replace('/\s+/', ' ', $name) ?? $name,
            'address' => preg_replace('/\s+/', ' ', $address) ?? $address,
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $facility = $this->route('facility');
            $facilityId = $facility instanceof Facility ? $facility->id : null;

            $name = mb_strtolower((string) $this->input('name', ''));
            $address = mb_strtolower((string) $this->input('address', ''));

            if ($name === '' || $address === '') {
                return;
            }

            $exists = Facility::query()
                ->when($facilityId, fn ($q) => $q->whereKeyNot($facilityId))
                ->whereRaw('LOWER(name) = ?', [$name])
                ->whereRaw('LOWER(address) = ?', [$address])
                ->exists();

            if ($exists) {
                $validator->errors()->add('name', 'A facility with this name and address already exists.');
            }
        });
    }
}
