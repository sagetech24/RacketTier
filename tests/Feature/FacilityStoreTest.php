<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilityStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_facility(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/auth/facilities', [
            'name' => 'Riverside Courts',
            'address' => '123 River Rd, Cebu City',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.name', 'Riverside Courts');

        $this->assertDatabaseHas('facilities', [
            'name' => 'Riverside Courts',
            'address' => '123 River Rd, Cebu City',
            'created_by' => $user->id,
        ]);
    }

    public function test_facility_index_supports_search(): void
    {
        Facility::query()->create([
            'name' => 'Alpha Dome',
            'address' => 'North district',
            'created_by' => null,
        ]);
        Facility::query()->create([
            'name' => 'Beta Hall',
            'address' => 'South district',
            'created_by' => null,
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/auth/facilities?q=Alpha');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Alpha Dome');
    }
}
