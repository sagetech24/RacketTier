<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->string('session_context', 32)->default('facility')->after('facility_id');
            $table->unsignedSmallInteger('win_points')->nullable()->after('session_context');
            $table->unsignedSmallInteger('loss_points')->nullable()->after('win_points');
            $table->unsignedInteger('completed_matches_count')->default(0)->after('loss_points');
        });

        Schema::table('game_sessions', function (Blueprint $table) {
            $table->foreignId('facility_id')->nullable()->change();
        });

        Schema::table('game_session_players', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('game_session_players', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
            $table->string('guest_name', 191)->nullable()->after('user_id');
        });

        Schema::table('game_session_players', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('game_session_players', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('game_session_players', function (Blueprint $table) {
            $table->dropColumn('guest_name');
            $table->foreignId('user_id')->nullable(false)->change();
        });

        Schema::table('game_session_players', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'session_context',
                'win_points',
                'loss_points',
                'completed_matches_count',
            ]);
        });

        Schema::table('game_sessions', function (Blueprint $table) {
            $table->foreignId('facility_id')->nullable(false)->change();
        });
    }
};
