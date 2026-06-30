import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchGameSession } from '../../api/gameSession.js';
import {
    fetchQueueingSessionMatches,
    postCreateQueueingSessionMatch,
} from '../../api/queueingSession.js';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { AutoMatchProposalsModal } from './AutoMatchProposalsModal.jsx';
import { parseAutoMatchCriteria } from './QueueingSessionAutoMatchCriteriaField.jsx';
import { QueueingSessionMatchLineupModal } from './QueueingSessionMatchLineupModal.jsx';

/**
 * @param {{
 *   session: import('../../api/gameSession.js').GameSessionDetail | null,
 *   sessionId: number | null,
 *   canManage?: boolean,
 *   matches?: Array<{ status?: string, lineup?: unknown, id?: number }>,
 *   onReload?: () => void | Promise<void>,
 *   onActionError?: (message: string) => void,
 * }} props
 */
export function QueueingSessionMatchFabPanel({
    session,
    sessionId,
    canManage = false,
    matches: matchesProp,
    onReload,
    onActionError,
}) {
    const fabRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [matches, setMatches] = useState(matchesProp ?? []);
    const [localSession, setLocalSession] = useState(session);
    const [createMatchOpen, setCreateMatchOpen] = useState(false);
    const [autoMatchProposalsOpen, setAutoMatchProposalsOpen] = useState(false);
    /** @type {import('../../api/queueingSession.js').AutoMatchCriteria | null} */
    const [autoMatchCriteria, setAutoMatchCriteria] = useState(null);

    useEffect(() => {
        setLocalSession(session);
    }, [session]);

    useEffect(() => {
        if (matchesProp != null) {
            setMatches(matchesProp);
        }
    }, [matchesProp]);

    useEffect(() => {
        if (!menuOpen) return undefined;

        function onPointerDown(event) {
            if (fabRef.current && !fabRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        }

        function onKeyDown(event) {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        }

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    const refreshMatchData = useCallback(async () => {
        if (sessionId == null) return;
        const [sessionData, matchRows] = await Promise.all([
            fetchGameSession(String(sessionId)),
            fetchQueueingSessionMatches(sessionId),
        ]);
        setLocalSession(sessionData);
        setMatches(matchRows);
        return { sessionData, matchRows };
    }, [sessionId]);

    const reportError = useCallback(
        (message) => {
            onActionError?.(message);
        },
        [onActionError],
    );

    function closeMenu() {
        setMenuOpen(false);
    }

    function toggleMenu() {
        if (busy) return;
        setMenuOpen((open) => !open);
    }

    function handleOpenAutoMatch() {
        if (sessionId == null || localSession == null) return;
        closeMenu();
        onActionError?.('');
        setAutoMatchCriteria(parseAutoMatchCriteria(localSession.auto_match_criteria));
        setAutoMatchProposalsOpen(true);
    }

    async function handleOpenCreateMatch() {
        if (sessionId == null) return;
        closeMenu();
        onActionError?.('');
        setBusy(true);
        try {
            await refreshMatchData();
            setCreateMatchOpen(true);
        } catch (e) {
            reportError(e instanceof Error ? e.message : 'Could not load session data.');
        } finally {
            setBusy(false);
        }
    }

    async function handleCreateMatch(lineup) {
        if (sessionId == null || localSession == null) return;
        setBusy(true);
        try {
            await postCreateQueueingSessionMatch(sessionId, { lineup });
            setCreateMatchOpen(false);
            if (onReload) {
                await onReload();
            } else {
                await refreshMatchData();
            }
        } catch (e) {
            reportError(e instanceof Error ? e.message : 'Could not create match.');
            throw e;
        } finally {
            setBusy(false);
        }
    }

    async function handleAutoMatchApproved() {
        if (onReload) {
            await onReload();
        } else {
            await refreshMatchData();
        }
    }

    if (!canManage || !localSession?.is_active) {
        return null;
    }

    return (
        <>
            {menuOpen ? (
                <div
                    className="rt-match-fab-backdrop fixed inset-0 z-[39] bg-[#131316]/35 backdrop-blur-[4px]"
                    aria-hidden
                    onPointerDown={closeMenu}
                />
            ) : null}

            <div ref={fabRef} className="fixed bottom-24 right-5 z-40 flex flex-col items-end md:bottom-8 md:right-8">
                {menuOpen ? (
                    <div
                        className="rt-match-fab-callout mb-3 w-[min(16rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-[#686898] bg-[#1b1b1e] p-1.5 shadow-2xl shadow-black/40"
                        role="menu"
                        aria-label="Create match options"
                    >
                            <button
                                type="button"
                                role="menuitem"
                                disabled={busy}
                                onClick={() => handleOpenAutoMatch()}
                                className="rt-match-fab-callout-item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#2a2a2d] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4ce081]/15 text-[#4ce081]">
                                    <MaterialIcon name="auto_awesome" className="text-xl!" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold text-[#e4e1e6]">Auto-match</span>
                                    <span className="block text-[10px] leading-snug text-[#918f9c]">
                                        Generate matches from the queue
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                disabled={busy}
                                onClick={() => handleOpenCreateMatch()}
                                className="rt-match-fab-callout-item mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#2a2a2d] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c2c1ff]/15">
                                    <img src="/images/rt-logo.png" alt="" className="h-6 w-6" aria-hidden />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold text-[#e4e1e6]">Manual match</span>
                                    <span className="block text-[10px] leading-snug text-[#918f9c]">
                                        Pick players and teams yourself
                                    </span>
                                </span>
                            </button>
                    </div>
                ) : null}

                <button
                    type="button"
                    disabled={busy}
                    onClick={toggleMenu}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label={menuOpen ? 'Close match options' : 'Create match'}
                    className="rt-kinetic-gradient opacity-70 hover:opacity-90 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#8181ac] text-[#131316] shadow-lg shadow-black/30 transition-transform transform duration-200 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <MaterialIcon
                        name="add"
                        className={`text-4xl! font-bold transition-transform duration-200 ${menuOpen ? 'rotate-45' : ''}`}
                    />
                </button>
            </div>

            <AutoMatchProposalsModal
                open={autoMatchProposalsOpen}
                sessionId={sessionId}
                criteria={autoMatchCriteria}
                onClose={() => setAutoMatchProposalsOpen(false)}
                onApproved={() => handleAutoMatchApproved()}
            />

            <QueueingSessionMatchLineupModal
                open={createMatchOpen}
                mode="create"
                session={localSession}
                matches={matches}
                busy={busy}
                onClose={() => setCreateMatchOpen(false)}
                onSave={handleCreateMatch}
            />
        </>
    );
}
