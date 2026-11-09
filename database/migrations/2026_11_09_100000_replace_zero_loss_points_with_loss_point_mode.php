<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->string('loss_point_mode', 16)->default('effort')->after('skip_scores');
        });

        if (Schema::hasColumn('game_sessions', 'zero_loss_points')) {
            DB::table('game_sessions')
                ->where('zero_loss_points', true)
                ->update(['loss_point_mode' => 'zero']);

            Schema::table('game_sessions', function (Blueprint $table) {
                $table->dropColumn('zero_loss_points');
            });
        }

        // SQLite stores integers without unsigned; MySQL needs a signed ledger column for penalties.
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('point_wallet_transactions', function (Blueprint $table) {
                $table->integer('balance_after')->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('point_wallet_transactions', function (Blueprint $table) {
                $table->unsignedInteger('balance_after')->change();
            });
        }

        Schema::table('game_sessions', function (Blueprint $table) {
            $table->boolean('zero_loss_points')->default(false)->after('skip_scores');
        });

        DB::table('game_sessions')
            ->where('loss_point_mode', 'zero')
            ->update(['zero_loss_points' => true]);

        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropColumn('loss_point_mode');
        });
    }
};
