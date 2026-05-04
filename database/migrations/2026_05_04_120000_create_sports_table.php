<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sports', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('code', 8);
            $table->string('icon', 64)->default('sports_tennis');
            $table->timestamps();
        });

        $now = now();
        DB::table('sports')->insert([
            ['slug' => 'pickleball', 'name' => 'Pickleball', 'code' => 'PKLB', 'icon' => 'sports_tennis', 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'badminton', 'name' => 'Badminton', 'code' => 'BDMN', 'icon' => 'sports_tennis', 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'tennis', 'name' => 'Tennis', 'code' => 'TNS', 'icon' => 'sports_tennis', 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'table-tennis', 'name' => 'Table Tennis', 'code' => 'TBLT', 'icon' => 'sports_tennis', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('sports');
    }
};
