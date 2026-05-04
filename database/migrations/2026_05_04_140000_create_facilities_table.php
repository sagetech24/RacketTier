<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address', 512)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        $now = now();
        DB::table('facilities')->insert([
            [
                'name' => 'Ground Zero Fitness Hub',
                'address' => 'Tipolo, Subangdaku, Cebu City, PH 6000',
                'created_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Metro Sports Club Cebu',
                'address' => 'Lahug, Cebu City, PH 6000',
                'created_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('facilities');
    }
};
