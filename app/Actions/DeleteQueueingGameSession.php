<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeleteQueueingGameSession
{
    public function execute(User $user, GameSession $session): void
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if (! $session->userCanDelete($user)) {
            abort(403, 'You are not allowed to delete this session.');
        }

        DB::transaction(function () use ($session): void {
            $session->delete();
        });
    }
}
