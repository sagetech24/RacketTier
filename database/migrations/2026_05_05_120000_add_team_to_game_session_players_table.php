<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_session_players', function (Blueprint $table) {
            $table->unsignedTinyInteger('team')->nullable()->after('is_playing');
        });
    }

    public function down(): void
    {
        Schema::table('game_session_players', function (Blueprint $table) {
            $table->dropColumn('team');
        });
    }
};
