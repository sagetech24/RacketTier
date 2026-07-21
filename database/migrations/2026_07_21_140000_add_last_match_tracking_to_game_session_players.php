<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_session_players', function (Blueprint $table) {
            $table->string('last_match_result', 4)->nullable()->after('losses_count');
            $table->unsignedBigInteger('last_match_id')->nullable()->after('last_match_result');
        });
    }

    public function down(): void
    {
        Schema::table('game_session_players', function (Blueprint $table) {
            $table->dropColumn(['last_match_result', 'last_match_id']);
        });
    }
};
