<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Queueing session draft storage driver
    |--------------------------------------------------------------------------
    |
    | "db" stores the live draft JSON on game_sessions.draft_snapshot (default).
    | "redis" stores drafts in Redis with periodic DB checkpoints.
    |
    */

    'draft_storage' => env('QUEUEING_DRAFT_STORAGE', 'db'),

    'draft_ttl_hours' => (int) env('QUEUEING_DRAFT_TTL_HOURS', 48),

    'checkpoint_every_mutations' => (int) env('QUEUEING_DRAFT_CHECKPOINT_EVERY', 5),

];
