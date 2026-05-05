<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tier_ranks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sport_id')->constrained('sports')->cascadeOnDelete();
            $table->unsignedTinyInteger('tier_no');
            $table->string('name');
            $table->unsignedInteger('start_point');
            $table->unsignedInteger('end_point');
            $table->boolean('status')->default(true);
            $table->timestamps();

            $table->unique(['sport_id', 'tier_no']);
        });

        Schema::create('member_point_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sport_id')->constrained('sports')->cascadeOnDelete();
            $table->integer('balance')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'sport_id']);
        });

        Schema::create('point_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_point_wallet_id')->constrained('member_point_wallets')->cascadeOnDelete();
            $table->foreignId('game_session_id')->nullable()->constrained('game_sessions')->nullOnDelete();
            $table->integer('amount');
            $table->unsignedInteger('balance_after');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('point_wallet_transactions');
        Schema::dropIfExists('member_point_wallets');
        Schema::dropIfExists('tier_ranks');
    }
};
