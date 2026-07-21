<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->boolean('optional_guest_skill')->default(true)->after('skip_scores');
            $table->boolean('optional_guest_gender')->default(true)->after('optional_guest_skill');
        });
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn(['optional_guest_skill', 'optional_guest_gender']);
        });
    }
};
