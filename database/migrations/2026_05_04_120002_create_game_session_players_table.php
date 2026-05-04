<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_session_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained('game_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('queue_position');
            $table->boolean('is_waiting')->default(true);
            $table->boolean('is_playing')->default(false);
            $table->timestamps();

            $table->unique(['game_session_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_session_players');
    }
};
