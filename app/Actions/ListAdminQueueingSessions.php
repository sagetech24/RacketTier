<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Services\QueueingSessionDraftHydrator;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdminQueueingSessions
{
    public function __construct(
        private QueueingSessionDraftHydrator $draftHydrator,
    ) {}

    /**
     * @return LengthAwarePaginator<int, GameSession>
     */
    public function execute(
        int $perPage = 20,
        ?string $status = null,
        ?int $sportId = null,
        ?string $search = null,
    ): LengthAwarePaginator {
        $perPage = max(1, min(50, $perPage));

        $query = GameSession::query()
            ->where('session_context', 'queueing')
            ->with(['sport:id,name', 'facility:id,name', 'creator:id,name,email'])
            ->withCount(['players', 'queueingMatches'])
            ->orderByDesc('updated_at');

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'ended') {
            $query->where('is_active', false);
        }

        if ($sportId !== null) {
            $query->where('sport_id', $sportId);
        }

        if ($search !== null && trim($search) !== '') {
            $term = '%'.trim($search).'%';
            $query->where(function ($q) use ($term): void {
                $q->where('queue_name', 'like', $term)
                    ->orWhereHas('creator', function ($creator) use ($term): void {
                        $creator->where('name', 'like', $term)
                            ->orWhere('email', 'like', $term);
                    });
            });
        }

        /** @var LengthAwarePaginator<int, GameSession> $paginator */
        $paginator = $query->paginate($perPage);
        $this->draftHydrator->applyListCounts(collect($paginator->items()));

        return $paginator;
    }
}
