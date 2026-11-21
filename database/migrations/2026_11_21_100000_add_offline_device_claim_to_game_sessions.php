<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->string('offline_device_id', 64)->nullable()->after('draft_snapshot');
            $table->timestamp('offline_claimed_at')->nullable()->after('offline_device_id');
        });
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn(['offline_device_id', 'offline_claimed_at']);
        });
    }
};
