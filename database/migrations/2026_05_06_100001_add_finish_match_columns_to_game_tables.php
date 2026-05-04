<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->unsignedSmallInteger('last_team1_score')->nullable()->after('status');
            $table->unsignedSmallInteger('last_team2_score')->nullable()->after('last_team1_score');
            $table->unsignedTinyInteger('last_winning_team')->nullable()->after('last_team2_score');
            $table->timestamp('last_finished_at')->nullable()->after('last_winning_team');
            $table->json('last_result_breakdown')->nullable()->after('last_finished_at');
        });

        Schema::table('game_session_players', function (Blueprint $table) {
            $table->unsignedInteger('wins_count')->default(0)->after('team');
            $table->unsignedInteger('losses_count')->default(0)->after('wins_count');
            $table->unsignedInteger('session_points')->default(0)->after('losses_count');
        });
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'last_team1_score',
                'last_team2_score',
                'last_winning_team',
                'last_finished_at',
                'last_result_breakdown',
            ]);
        });

        Schema::table('game_session_players', function (Blueprint $table) {
            $table->dropColumn(['wins_count', 'losses_count', 'session_points']);
        });
    }
};
