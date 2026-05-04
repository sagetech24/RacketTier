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
            $table->foreignId('facility_id')->nullable()->after('id')->constrained('facilities')->restrictOnDelete();
        });

        $defaultId = (int) DB::table('facilities')->orderBy('id')->value('id');
        if ($defaultId > 0) {
            DB::table('game_sessions')->whereNull('facility_id')->update(['facility_id' => $defaultId]);
        }

        Schema::table('game_sessions', function (Blueprint $table) {
            $table->foreignId('facility_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('game_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('facility_id');
        });
    }
};
