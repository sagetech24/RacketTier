<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_session_players', function (Blueprint $table) {
            $table->string('pronoun', 32)->nullable()->after('guest_name');
            $table->unsignedTinyInteger('skill_level')->nullable()->after('pronoun');
        });
    }

    public function down(): void
    {
        Schema::table('game_session_players', function (Blueprint $table) {
            $table->dropColumn(['pronoun', 'skill_level']);
        });
    }
};
