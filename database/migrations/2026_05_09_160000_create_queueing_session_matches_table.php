<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queueing_session_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained('game_sessions')->cascadeOnDelete();
            $table->unsignedInteger('match_no');
            $table->string('status', 16)->default('queueing');
            $table->json('lineup')->nullable();
            $table->unsignedSmallInteger('team1_score')->nullable();
            $table->unsignedSmallInteger('team2_score')->nullable();
            $table->unsignedTinyInteger('winning_team')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->json('result_breakdown')->nullable();
            $table->timestamps();

            $table->index(['game_session_id', 'status']);
            $table->unique(['game_session_id', 'match_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queueing_session_matches');
    }
};
