<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class GetQueueingSessionHistory
{
    private const DEFAULT_LIMIT = 15;

    private const MAX_LIMIT = 50;

    /**
     * @return array{
     *     items: Collection<int, GameSession>,
     *     next_cursor: string|null,
     *     has_more: bool,
     * }
     */
    public function execute(
        User $user,
        ?string $cursor = null,
        int $limit = self::DEFAULT_LIMIT,
        ?string $search = null,
        bool $mineOnly = false,
    ): array {
        $limit = max(1, min($limit, self::MAX_LIMIT));
        $cursorData = $this->parseCursor($cursor);

        $query = GameSession::query()
            ->where('session_context', 'queueing')
            ->where('is_active', false)
            ->whereNotNull('ended_at')
            ->when(
                ! $user->isAdmin(),
                fn (Builder $q) => $q->whereUserIsParticipant($user),
            )
            ->when($mineOnly, fn (Builder $q) => $q->where('created_by', $user->id))
            ->when($search !== null && $search !== '', function (Builder $q) use ($search): void {
                $needle = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
                $q->where(function (Builder $inner) use ($needle, $search): void {
                    $inner->where('queue_name', 'like', $needle)
                        ->orWhereHas('sport', fn (Builder $s) => $s->where('name', 'like', $needle))
                        ->orWhereHas('creator', fn (Builder $c) => $c->where('name', 'like', $needle));

                    if (ctype_digit((string) $search)) {
                        $inner->orWhere('id', (int) $search);
                    }
                });
            })
            ->with(['sport', 'creator:id,name,email'])
            ->withCount('players');

        if ($cursorData !== null) {
            $query->where(function (Builder $q) use ($cursorData): void {
                $q->where('ended_at', '<', $cursorData['ended_at'])
                    ->orWhere(function (Builder $tie) use ($cursorData): void {
                        $tie->where('ended_at', $cursorData['ended_at'])
                            ->where('id', '<', $cursorData['id']);
                    });
            });
        }

        $rows = $query
            ->orderByDesc('ended_at')
            ->orderByDesc('id')
            ->limit($limit + 1)
            ->get();

        $hasMore = $rows->count() > $limit;
        $items = $rows->take($limit)->values();

        $nextCursor = null;
        if ($hasMore && $items->isNotEmpty()) {
            /** @var GameSession $last */
            $last = $items->last();
            if ($last->ended_at !== null) {
                $nextCursor = $this->encodeCursor($last->ended_at, (int) $last->id);
            }
        }

        return [
            'items' => $items,
            'next_cursor' => $nextCursor,
            'has_more' => $hasMore,
        ];
    }

    /**
     * @return array{ended_at: CarbonInterface, id: int}|null
     */
    private function parseCursor(?string $cursor): ?array
    {
        if ($cursor === null || trim($cursor) === '') {
            return null;
        }

        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);
        if ($decoded === false) {
            return null;
        }

        $data = json_decode($decoded, true);
        if (! is_array($data) || empty($data['ended_at']) || ! isset($data['id'])) {
            return null;
        }

        try {
            return [
                'ended_at' => Carbon::parse((string) $data['ended_at']),
                'id' => (int) $data['id'],
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    private function encodeCursor(CarbonInterface $endedAt, int $id): string
    {
        $json = json_encode([
            'ended_at' => $endedAt->toIso8601String(),
            'id' => $id,
        ], JSON_THROW_ON_ERROR);

        return rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    }
}
