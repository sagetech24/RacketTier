import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDeviceId } from '../../lib/deviceId.js';
import { useConnectionStatus } from '../../hooks/useConnectionStatus.js';
import { fetchGameSession } from '../../api/gameSession.js';
import { fetchQueueingSessionMatches } from '../../api/queueingSession.js';
import { postClaimQueueingDevice } from '../../api/queueingOfflineApi.js';
import {
    getOfflineSession,
    setConflict,
    takeOverOfflineSession,
} from '../../offline/queueingDraftDb.js';
import { syncQueueingOutbox } from '../../offline/syncQueueingOutbox.js';
import { toast } from '../../lib/toast.js';

/**
 * @param {{ sessionId: string|number, session?: Record<string, unknown> | null }} props
 */
export function QueueingOfflineBanner({ sessionId, session = null }) {
    const { status, isOffline, isSyncing, outboxCount } = useConnectionStatus();
    const queryClient = useQueryClient();
    const [conflict, setConflictLocal] = useState(false);
    const [pendingEnd, setPendingEndLocal] = useState(false);
    const [foreignDevice, setForeignDevice] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const row = await getOfflineSession(sessionId);
            if (cancelled || !row) return;
            setConflictLocal(Boolean(row.conflict));
            setPendingEndLocal(Boolean(row.pendingEnd));
            const claimed = session?.offline_device_id;
            if (claimed && claimed !== getDeviceId()) {
                setForeignDevice(true);
            } else {
                setForeignDevice(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [sessionId, session?.offline_device_id, status, outboxCount]);

    useEffect(() => {
        function onOnline() {
            void syncQueueingOutbox(sessionId, {
                onConflict: () => {
                    setConflictLocal(true);
                    toast.error('Session changed elsewhere. Refresh or take over this device.');
                },
                onAuthError: () => toast.error('Sign in again to sync offline changes.'),
            }).then(async (result) => {
                if (result?.conflict) return;
                await queryClient.invalidateQueries({ queryKey: ['queueing-session', sessionId] });
                await queryClient.invalidateQueries({
                    queryKey: ['queueing-session-matches', sessionId],
                });
                const row = await getOfflineSession(sessionId);
                setPendingEndLocal(Boolean(row?.pendingEnd));
                if (result?.synced > 0) {
                    toast.success(`Synced ${result.synced} offline change${result.synced === 1 ? '' : 's'}.`);
                }
            }).catch(() => {
                /* stay offline */
            });
        }
        window.addEventListener('rt:connection-online', onOnline);
        window.addEventListener('online', onOnline);
        return () => {
            window.removeEventListener('rt:connection-online', onOnline);
            window.removeEventListener('online', onOnline);
        };
    }, [sessionId, queryClient]);

    async function handleDiscardAndRefresh() {
        try {
            const fresh = await fetchGameSession(String(sessionId));
            const matches = await fetchQueueingSessionMatches(sessionId);
            await takeOverOfflineSession(sessionId, { session: fresh, matches });
            await setConflict(sessionId, false);
            setConflictLocal(false);
            queryClient.setQueryData(['queueing-session', sessionId], fresh);
            queryClient.setQueryData(
                ['queueing-session-matches', sessionId, fresh.draft_version ?? null],
                matches,
            );
            toast.success('Loaded latest session from server. Local outbox discarded.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not refresh session.');
        }
    }

    async function handleTakeOver() {
        try {
            await postClaimQueueingDevice(sessionId, getDeviceId());
            await handleDiscardAndRefresh();
            setForeignDevice(false);
            toast.success('This device now owns the offline session.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not claim device.');
        }
    }

    if (!isOffline && !isSyncing && !conflict && !pendingEnd && !foreignDevice) {
        return null;
    }

    let message = '';
    let tone = 'border-amber-500/40 bg-amber-50 text-amber-950';
    if (conflict) {
        message = 'Conflict: session was updated on the server. Refresh to discard local outbox, or keep working offline.';
        tone = 'border-rose-500/40 bg-rose-50 text-rose-950';
    } else if (isSyncing) {
        message = `Syncing ${outboxCount || ''} offline change${outboxCount === 1 ? '' : 's'}…`;
        tone = 'border-sky-500/40 bg-sky-50 text-sky-950';
    } else if (isOffline) {
        message =
            outboxCount > 0
                ? `Offline — ${outboxCount} change${outboxCount === 1 ? '' : 's'} saved on this device. Using session stats for auto-match.`
                : 'Offline — changes will save on this device. Using session stats for auto-match.';
    } else if (pendingEnd) {
        message = 'Session will end automatically when back online and sync finishes.';
    } else if (foreignDevice) {
        message = 'Another device claimed this session for offline use. Take over only if you finished syncing there.';
        tone = 'border-amber-500/40 bg-amber-50 text-amber-950';
    }

    return (
        <div
            className={`mb-4 rounded-xl border px-3 py-2.5 text-sm ${tone}`}
            role="status"
            data-offline-status={status}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium leading-snug">{message}</p>
                <div className="flex flex-wrap gap-2">
                    {conflict ? (
                        <button
                            type="button"
                            className="rounded-lg bg-rose-900 px-3 py-1.5 text-xs font-semibold text-white"
                            onClick={() => void handleDiscardAndRefresh()}
                        >
                            Refresh from server
                        </button>
                    ) : null}
                    {foreignDevice && !isOffline ? (
                        <button
                            type="button"
                            className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white"
                            onClick={() => void handleTakeOver()}
                        >
                            Take over on this device
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
