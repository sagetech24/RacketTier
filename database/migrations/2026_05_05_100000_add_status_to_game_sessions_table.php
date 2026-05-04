<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->string('status', 16)->default('pending')->after('is_active');
        });

        DB::table('game_sessions')->whereExists(function ($q): void {
            $q->select(DB::raw(1))
                ->from('game_session_players')
                ->whereColumn('game_session_players.game_session_id', 'game_sessions.id')
                ->where('game_session_players.is_playing', true);
        })->update(['status' => 'ongoing']);
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
