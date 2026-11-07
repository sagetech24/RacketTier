<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table): void {
            $table->json('auto_suggest_matches')->nullable()->after('auto_match_criteria');
        });
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table): void {
            $table->dropColumn('auto_suggest_matches');
        });
    }
};
