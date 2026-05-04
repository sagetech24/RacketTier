<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rankings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('sport_id')->constrained('sports')->cascadeOnDelete();
            $table->unsignedInteger('rating')->default(1000);
            $table->timestamps();

            $table->unique(['user_id', 'sport_id']);
        });

        Schema::create('rating_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('sport_id')->constrained('sports')->cascadeOnDelete();
            $table->foreignId('game_session_id')->nullable()->constrained('game_sessions')->nullOnDelete();
            $table->integer('rating_before');
            $table->integer('rating_after');
            $table->integer('rating_change');
            $table->timestamps();

            $table->index(['user_id', 'sport_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rating_histories');
        Schema::dropIfExists('rankings');
    }
};
