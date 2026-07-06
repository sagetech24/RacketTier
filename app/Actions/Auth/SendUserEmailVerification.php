<?php

namespace App\Actions\Auth;

use App\Models\User;

class SendUserEmailVerification
{
    /**
     * Send the verification email without failing the surrounding request when mail transport is unavailable.
     */
    public function __invoke(User $user): bool
    {
        try {
            $user->sendEmailVerificationNotification();

            return true;
        } catch (\Throwable $exception) {
            report($exception);

            return false;
        }
    }
}
