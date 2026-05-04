<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('game_sessions')->where('status', 'pending')->update(['status' => 'queueing']);

        Schema::table('game_sessions', function (Blueprint $table) {
            $table->string('status', 16)->default('queueing')->change();
        });
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->string('status', 16)->default('pending')->change();
        });

        DB::table('game_sessions')->where('status', 'queueing')->update(['status' => 'pending']);
    }
};
