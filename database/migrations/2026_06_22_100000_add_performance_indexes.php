<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rankings', function (Blueprint $table): void {
            $table->index(['sport_id', 'rating', 'id'], 'rankings_sport_rating_id_index');
        });

        Schema::table('game_sessions', function (Blueprint $table): void {
            $table->index(['session_context', 'is_active', 'ended_at'], 'game_sessions_context_active_ended_index');
            $table->index(['facility_id', 'created_at'], 'game_sessions_facility_created_index');
            $table->index(['status', 'last_finished_at'], 'game_sessions_status_last_finished_index');
        });

        Schema::table('game_session_players', function (Blueprint $table): void {
            $table->index(['game_session_id', 'queue_position'], 'game_session_players_session_queue_index');
        });

        Schema::table('rating_histories', function (Blueprint $table): void {
            $table->index('game_session_id', 'rating_histories_game_session_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('rating_histories', function (Blueprint $table): void {
            $table->dropIndex('rating_histories_game_session_id_index');
        });

        Schema::table('game_session_players', function (Blueprint $table): void {
            $table->dropIndex('game_session_players_session_queue_index');
        });

        Schema::table('game_sessions', function (Blueprint $table): void {
            $table->dropIndex('game_sessions_context_active_ended_index');
            $table->dropIndex('game_sessions_facility_created_index');
            $table->dropIndex('game_sessions_status_last_finished_index');
        });

        Schema::table('rankings', function (Blueprint $table): void {
            $table->dropIndex('rankings_sport_rating_id_index');
        });
    }
};
