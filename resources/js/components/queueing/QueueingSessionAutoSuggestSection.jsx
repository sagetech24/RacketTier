import { useState } from 'react';
import {
    deleteQueueingSessionAutoSuggest,
    postApproveQueueingSessionAutoSuggest,
} from '../../api/queueingSession.js';
import { toast } from '../../lib/toast.js';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { QueueingSessionMatchCard } from './QueueingSessionMatchCard.jsx';

/**
 * @typedef {import('../../api/queueingSession.js').AutoSuggestMatch} AutoSuggestMatch
 * @typedef {import('../../api/queueingSession.js').AutoSuggestMatchesPayload} AutoSuggestMatchesPayload
 */

/**
 * @param {AutoSuggestMatch} suggestion
 * @param {number} index
 */
function suggestionToMatchRow(suggestion, index) {
    const lineup = Array.isArray(suggestion.players)
        ? suggestion.players.map((player) => ({
              game_session_player_id: player.game_session_player_id,
              user_id: player.user_id,
              guest_name: player.guest_name,
              name: player.name,
              team: player.team,
          }))
        : (suggestion.lineup ?? []).map((row) => ({
              game_session_player_id: row.id,
              name: 'Player',
              team: row.team,
          }));

    return {
        id: suggestion.suggestion_id,
        status: 'queueing',
        match_no: suggestion.wave ?? index + 1,
        from_lobby: Boolean(suggestion.from_lobby),
        lineup,
    };
}

/**
 * @param {{
 *   sessionId: number,
 *   autoSuggestMatches: AutoSuggestMatchesPayload | null | undefined,
 *   canManage: boolean,
 *   busy?: boolean,
 *   onApproved: () => Promise<void> | void,
 *   onDismissed?: () => Promise<void> | void,
 *   onActionError?: (message: string) => void,
 * }} props
 */
export function QueueingSessionAutoSuggestSection({
    sessionId,
    autoSuggestMatches,
    canManage,
    busy = false,
    onApproved,
    onDismissed,
    onActionError,
}) {
    const [approvingId, setApprovingId] = useState(/** @type {string | null} */ (null));
    const [dismissingId, setDismissingId] = useState(/** @type {string | null} */ (null));

    if (!canManage) {
        return null;
    }

    const suggestions = Array.isArray(autoSuggestMatches?.suggestions)
        ? autoSuggestMatches.suggestions
        : [];

    if (suggestions.length === 0) {
        return null;
    }

    const cardBusy = busy || Boolean(approvingId) || Boolean(dismissingId);

    /**
     * @param {AutoSuggestMatch} suggestion
     */
    async function handleApprove(suggestion) {
        if (!suggestion.players_ready || approvingId || dismissingId) return;
        setApprovingId(suggestion.suggestion_id);
        onActionError?.('');
        try {
            await postApproveQueueingSessionAutoSuggest(sessionId, suggestion.suggestion_id);
            toast.success('Match queued from auto-suggest.');
            await onApproved();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not approve auto-suggest match.';
            onActionError?.(message);
            toast.error(message);
        } finally {
            setApprovingId(null);
        }
    }

    /**
     * @param {AutoSuggestMatch} suggestion
     */
    async function handleDismiss(suggestion) {
        if (approvingId || dismissingId) return;
        setDismissingId(suggestion.suggestion_id);
        onActionError?.('');
        try {
            await deleteQueueingSessionAutoSuggest(sessionId, suggestion.suggestion_id);
            toast.success('Suggestion removed.');
            await (onDismissed ?? onApproved)();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not remove suggestion.';
            onActionError?.(message);
            toast.error(message);
        } finally {
            setDismissingId(null);
        }
    }

    return (
        <section className="mt-12" aria-labelledby="auto-suggest-heading">
            <div className="mb-4 flex items-start gap-2">
                <MaterialIcon name="auto_awesome" className="mt-0.5 text-[#c2c1ff] text-[18px]!" />
                <div className="min-w-0">
                    <h3 id="auto-suggest-heading" className="text-sm font-bold text-[#e8e7ef]">
                        Auto-Suggest
                    </h3>
                    <p className="text-xs text-[#bab9c0]">
                        System previews from saved auto-match criteria. Approve queues the next ready match.
                    </p>
                </div>
            </div>

            <ul className="rt-match-cards-grid space-y-3 md:space-y-0">
                {suggestions.map((suggestion, index) => (
                    <li key={suggestion.suggestion_id}>
                        <QueueingSessionMatchCard
                            row={suggestionToMatchRow(suggestion, index)}
                            index={index}
                            canManageMatches
                            busy={cardBusy}
                            variant="suggest"
                            suggestReady={Boolean(suggestion.players_ready)}
                            suggestBracketLabel={suggestion.bracket_label ?? null}
                            onApproveSuggest={() => handleApprove(suggestion)}
                            onDismissSuggest={() => handleDismiss(suggestion)}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}
