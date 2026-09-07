import { useEffect, useId, useState } from 'react';
import { ModalPortal } from '../app/ModalPortal.jsx';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { AddQueueingSessionPlayerModal } from './AddQueueingSessionPlayerModal.jsx';
import { QueueingSessionAddMemberPickerModal } from './QueueingSessionAddMemberPickerModal.jsx';

/** @typedef {'guest' | 'members'} AddPlayersTab */

const TABS = [
    { id: 'guest', label: 'Add guest players', icon: 'person_add' },
    { id: 'members', label: 'Add members', icon: 'group_add' },
];

/**
 * Combined roster modal: guests and members in one sheet with tabs.
 *
 * @param {{
 *   open: boolean,
 *   sportId?: number | null,
 *   sportName?: string | null,
 *   rosterUserIds: Set<number>,
 *   busy?: boolean,
 *   showSkillLevel?: boolean,
 *   optionalGuestSkill?: boolean,
 *   optionalGuestGender?: boolean,
 *   onClose: () => void,
 *   onSelectMember: (member: {
 *     id: number,
 *     name: string,
 *     pronoun?: string | null,
 *     skill_level?: number | null,
 *   }) => void,
 *   onAddGuest: (payload: {
 *     guest_name?: string,
 *     pronoun?: string | null,
 *     skill_level: number | null,
 *   }) => void | Promise<void>,
 * }} props
 */
export function QueueingSessionAddPlayersModal({
    open,
    sportId = null,
    sportName = null,
    rosterUserIds,
    busy = false,
    showSkillLevel = true,
    optionalGuestSkill = true,
    optionalGuestGender = true,
    onClose,
    onSelectMember,
    onAddGuest,
}) {
    const baseId = useId();
    /** @type {[AddPlayersTab, (tab: AddPlayersTab) => void]} */
    const [tab, setTab] = useState(/** @type {AddPlayersTab} */ ('guest'));
    /** @type {[{ id: number, name: string, pronoun?: string | null, skill_level?: number | null } | null, Function]} */
    const [pendingMember, setPendingMember] = useState(null);

    useEffect(() => {
        if (!open) return;
        setTab('guest');
        setPendingMember(null);
    }, [open]);

    useEffect(() => {
        if (!open || busy) return undefined;

        function onKeyDown(event) {
            if (event.key !== 'Escape') return;
            if (pendingMember) {
                setPendingMember(null);
                return;
            }
            onClose();
        }

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, busy, onClose, pendingMember]);

    useEffect(() => {
        if (!open) return undefined;

        const frame = window.requestAnimationFrame(() => {
            let targetId = 'rt-add-player-guest-name';
            if (tab === 'members') {
                targetId = pendingMember
                    ? 'rt-add-player-skill-level-member'
                    : 'rt-add-players-member-search';
            }
            document.getElementById(targetId)?.focus();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [open, tab, pendingMember]);

    if (!open) return null;

    /**
     * @param {AddPlayersTab} next
     */
    function selectTab(next) {
        if (busy) return;
        setPendingMember(null);
        setTab(next);
    }

    /**
     * @param {{ id: number, name: string, pronoun?: string | null, skill_level?: number | null }} member
     */
    async function handlePickMember(member) {
        if (showSkillLevel) {
            setPendingMember(member);
            return;
        }

        try {
            await onSelectMember(member);
        } catch {
            /* Parent surfaces errors via actionError */
        }
    }

    /**
     * @param {{ skill_level: number | null }} payload
     */
    async function handleConfirmPendingMember(payload) {
        if (!pendingMember) return;
        await onSelectMember({
            ...pendingMember,
            skill_level: payload.skill_level,
        });
        setPendingMember(null);
    }

    /**
     * @param {import('react').KeyboardEvent<HTMLDivElement>} event
     */
    function handleTabListKeyDown(event) {
        const index = TABS.findIndex((item) => item.id === tab);
        if (index < 0) return;

        /** @type {AddPlayersTab | null} */
        let next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            next = TABS[(index + 1) % TABS.length].id;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            next = TABS[(index - 1 + TABS.length) % TABS.length].id;
        } else if (event.key === 'Home') {
            next = TABS[0].id;
        } else if (event.key === 'End') {
            next = TABS[TABS.length - 1].id;
        }

        if (!next) return;
        event.preventDefault();
        selectTab(next);
        const nextButton = document.getElementById(`${baseId}-tab-${next}`);
        nextButton?.focus();
    }

    return (
        <ModalPortal open={open}>
            <div className="rt-end-match-modal-overlay fixed inset-0 z-200 flex items-stretch justify-center sm:items-center sm:p-6">
                <button
                    type="button"
                    className="absolute inset-0"
                    aria-label="Close add players"
                    onClick={() => {
                        if (!busy) onClose();
                    }}
                />
                <div
                    className="rt-end-match-modal-sheet relative flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col rounded-none border-0 border-[#2a2a2d] bg-[#1b1b1e] shadow-xl sm:h-[min(92dvh,44rem)] sm:max-h-[min(92dvh,44rem)] sm:rounded-2xl sm:border"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`${baseId}-title`}
                >
                    <div className="shrink-0 border-b border-white/5 px-5 pb-4 pt-5">
                        <h3 id={`${baseId}-title`} className="text-lg font-bold text-[#e4e1e6]">
                            Add players
                        </h3>
                        <p className="mt-1 text-sm text-[#918f9c]">
                            {tab === 'guest'
                                ? 'Quick-add drop-in players by name. Guests stay in-session only.'
                                : pendingMember
                                  ? `Set a tier level for ${pendingMember.name}, then you can add another player.`
                                  : 'Search registered members. They earn ELO and session points.'}
                        </p>

                        <div
                            className="rt-add-players-tabs mt-4"
                            role="tablist"
                            aria-label="Player type"
                            onKeyDown={handleTabListKeyDown}
                        >
                            {TABS.map((item) => {
                                const selected = tab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="tab"
                                        id={`${baseId}-tab-${item.id}`}
                                        aria-selected={selected}
                                        aria-controls={`${baseId}-panel-${item.id}`}
                                        tabIndex={selected ? 0 : -1}
                                        disabled={busy}
                                        onClick={() => selectTab(item.id)}
                                        className={[
                                            'rt-add-players-tab',
                                            selected ? 'rt-add-players-tab--active' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                    >
                                        <MaterialIcon name={item.icon} className="rt-add-players-tab__icon" />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col">
                        <div
                            id={`${baseId}-panel-guest`}
                            role="tabpanel"
                            aria-labelledby={`${baseId}-tab-guest`}
                            hidden={tab !== 'guest'}
                            inert={tab !== 'guest'}
                            className={
                                tab === 'guest'
                                    ? 'min-h-0 flex-1 overflow-y-auto px-5 py-4'
                                    : 'hidden'
                            }
                        >
                            <AddQueueingSessionPlayerModal
                                open={open}
                                embedded
                                mode="guest"
                                intent="add"
                                optionalGuestSkill={optionalGuestSkill}
                                optionalGuestGender={optionalGuestGender}
                                busy={busy}
                                onCancel={onClose}
                                onConfirm={onAddGuest}
                            />
                        </div>

                        <div
                            id={`${baseId}-panel-members`}
                            role="tabpanel"
                            aria-labelledby={`${baseId}-tab-members`}
                            hidden={tab !== 'members'}
                            inert={tab !== 'members'}
                            className={
                                tab === 'members' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'
                            }
                        >
                            {pendingMember ? (
                                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                                    <AddQueueingSessionPlayerModal
                                        open={open}
                                        embedded
                                        mode="member"
                                        intent="add"
                                        member={pendingMember}
                                        optionalGuestSkill={false}
                                        optionalGuestGender
                                        busy={busy}
                                        onCancel={() => {
                                            if (!busy) setPendingMember(null);
                                        }}
                                        onConfirm={(payload) => handleConfirmPendingMember(payload)}
                                    />
                                </div>
                            ) : (
                                <QueueingSessionAddMemberPickerModal
                                    open={open}
                                    embedded
                                    sportId={sportId}
                                    sportName={sportName}
                                    rosterUserIds={rosterUserIds}
                                    busy={busy}
                                    showSkillLevel={showSkillLevel}
                                    onClose={onClose}
                                    onSelectMember={handlePickMember}
                                />
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-white/5 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onClose}
                            className="w-full min-h-11 cursor-pointer rounded-lg border border-white/50 py-2.5 text-sm font-bold text-white/70 transition-transform duration-150 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
