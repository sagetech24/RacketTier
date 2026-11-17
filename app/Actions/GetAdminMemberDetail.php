<?php

namespace App\Actions;

use App\Http\Resources\UserResource;
use App\Models\GameSession;
use App\Models\MemberPointWallet;
use App\Models\Ranking;
use App\Models\Sport;
use App\Models\TierRank;
use App\Models\User;
use Illuminate\Http\Request;

class GetAdminMemberDetail
{
    /**
     * @return array{
     *   user: array<string, mixed>,
     *   sports: list<array{
     *     sport_id: int,
     *     sport_name: string,
     *     rating: int|null,
     *     wallet_balance: int,
     *     tier: array{id: int, tier_no: int, name: string}|null
     *   }>,
     *   recent_sessions: list<array{
     *     id: int,
     *     queue_name: string|null,
     *     session_context: string,
     *     sport_name: string|null,
     *     is_active: bool,
     *     ended_at: string|null,
     *     updated_at: string|null
     *   }>
     * }
     */
    public function execute(User $member, Request $request): array
    {
        $sports = Sport::query()->orderBy('id')->get(['id', 'name']);
        $rankings = Ranking::query()
            ->where('user_id', $member->id)
            ->get()
            ->keyBy('sport_id');
        $wallets = MemberPointWallet::query()
            ->where('user_id', $member->id)
            ->get()
            ->keyBy('sport_id');

        $sportRows = [];
        foreach ($sports as $sport) {
            $balance = (int) ($wallets->get($sport->id)?->balance ?? 0);
            $tier = TierRank::tierForPoints((int) $sport->id, $balance);
            $rating = $rankings->get($sport->id)?->rating;

            $sportRows[] = [
                'sport_id' => (int) $sport->id,
                'sport_name' => (string) $sport->name,
                'rating' => $rating !== null ? (int) $rating : null,
                'wallet_balance' => $balance,
                'tier' => $tier ? [
                    'id' => (int) $tier->id,
                    'tier_no' => (int) $tier->tier_no,
                    'name' => (string) $tier->name,
                ] : null,
            ];
        }

        $recentSessions = GameSession::query()
            ->whereUserIsParticipant($member)
            ->with(['sport:id,name'])
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get()
            ->map(fn (GameSession $session): array => [
                'id' => (int) $session->id,
                'queue_name' => $session->queue_name,
                'session_context' => (string) ($session->session_context ?? 'facility'),
                'sport_name' => $session->sport?->name,
                'is_active' => (bool) $session->is_active,
                'ended_at' => $session->ended_at?->toIso8601String(),
                'updated_at' => $session->updated_at?->toIso8601String(),
            ])
            ->all();

        return [
            'user' => (new UserResource($member))->toArray($request),
            'sports' => $sportRows,
            'recent_sessions' => $recentSessions,
        ];
    }
}
