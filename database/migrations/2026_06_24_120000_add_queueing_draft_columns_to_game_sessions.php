<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table): void {
            $table->string('persistence_state', 16)->default('persisted')->after('session_context');
            $table->unsignedInteger('draft_version')->default(0)->after('persistence_state');
            $table->json('draft_participant_user_ids')->nullable()->after('draft_version');
            $table->json('draft_snapshot')->nullable()->after('draft_participant_user_ids');
        });
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table): void {
            $table->dropColumn([
                'persistence_state',
                'draft_version',
                'draft_participant_user_ids',
                'draft_snapshot',
            ]);
        });
    }
};
