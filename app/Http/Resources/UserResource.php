<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'age' => $this->age !== null ? (int) $this->age : null,
            'pronoun' => $this->pronoun,
            'member_since' => $this->created_at?->toIso8601String(),
            'member_since_human' => $this->created_at?->diffForHumans(),
            'is_admin' => (bool) $this->is_admin,
            'email_verified' => $this->hasVerifiedEmail(),
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
        ];
    }
}
