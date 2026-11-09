<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Penalty loss mode can store negative session points; unsigned rejects them on end-session persist.
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('game_session_players', function (Blueprint $table) {
            $table->integer('session_points')->default(0)->change();
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('game_session_players', function (Blueprint $table) {
            $table->unsignedInteger('session_points')->default(0)->change();
        });
    }
};
