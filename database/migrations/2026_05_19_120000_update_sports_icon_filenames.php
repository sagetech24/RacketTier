<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** @var array<string, string> */
    private const ICON_BY_SLUG = [
        'pickleball' => 'pickleball.png',
        'badminton' => 'badminton.png',
        'tennis' => 'tennis.png',
        'table-tennis' => 'table-tennis.png',
    ];

    public function up(): void
    {
        foreach (self::ICON_BY_SLUG as $slug => $icon) {
            DB::table('sports')->where('slug', $slug)->update(['icon' => $icon]);
        }

        DB::table('sports')
            ->where('icon', 'sports_tennis')
            ->update(['icon' => 'tennis.png']);
    }

    public function down(): void
    {
        foreach (array_keys(self::ICON_BY_SLUG) as $slug) {
            DB::table('sports')->where('slug', $slug)->update(['icon' => 'sports_tennis']);
        }
    }
};
