import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDragScrollLock } from '../../hooks/useDragScrollLock.js';
import { QueueingSessionPlayerCard, rosterPlayerName } from './QueueingSessionPlayerCard.jsx';

/**
 * @typedef {NonNullable<import('../../api/gameSession.js').GameSessionDetail['players']>[number]} RosterPlayer
 */

function prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
function PortaledDragOverlay({ children }) {
    const overlay = (
        <DragOverlay
            dropAnimation={prefersReducedMotion() ? null : undefined}
            style={{ pointerEvents: 'none' }}
            zIndex={300}
        >
            {children}
        </DragOverlay>
    );

    if (typeof document === 'undefined') {
        return overlay;
    }

    return createPortal(overlay, document.body);
}

/**
 * @param {{
 *   player: RosterPlayer,
 *   index: number,
 *   disabled?: boolean,
 *   sessionActive?: boolean,
 *   isYou?: boolean,
 *   canEdit?: boolean,
 *   canRemove?: boolean,
 *   busy?: boolean,
 *   showSkillLevel?: boolean,
 *   status: ReturnType<import('./QueueingSessionPlayerCard.jsx').playerRosterStatus>,
 *   onEdit?: () => void,
 *   onRemove?: () => void,
 * }} props
 */
function SortableCheckInCard({
    player,
    index,
    disabled = false,
    sessionActive = false,
    isYou = false,
    canEdit = false,
    canRemove = false,
    busy = false,
    showSkillLevel = true,
    status,
    onEdit,
    onRemove,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: String(player.id),
        disabled,
    });

    const reduceMotion = prefersReducedMotion();
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: reduceMotion ? undefined : transition,
        opacity: isDragging ? 0.35 : undefined,
        animationDelay: `${0.08 + (index % 10) * 0.04}s`,
    };

    return (
        <div ref={setNodeRef} style={style} className="min-w-0 h-full touch-none">
            <QueueingSessionPlayerCard
                player={player}
                status={status}
                position={index + 1}
                sessionActive={sessionActive}
                isYou={isYou}
                canEdit={canEdit}
                canRemove={canRemove}
                busy={busy}
                showSkillLevel={showSkillLevel}
                sortable={!disabled}
                isDragging={isDragging}
                dragRef={null}
                dragProps={
                    disabled
                        ? {}
                        : {
                              ...attributes,
                              ...listeners,
                          }
                }
                onEdit={onEdit}
                onRemove={onRemove}
            />
        </div>
    );
}

/**
 * @param {{
 *   players: RosterPlayer[],
 *   disabled?: boolean,
 *   sessionActive?: boolean,
 *   currentUserId?: number | null,
 *   canManage?: boolean,
 *   busy?: boolean,
 *   showSkillLevel?: boolean,
 *   playerStatus: (p: RosterPlayer) => ReturnType<import('./QueueingSessionPlayerCard.jsx').playerRosterStatus>,
 *   canEditPlayer: (p: RosterPlayer) => boolean,
 *   canRemovePlayer: (p: RosterPlayer) => boolean,
 *   onEdit: (p: RosterPlayer) => void,
 *   onRemove: (p: RosterPlayer) => void,
 *   onReorder: (orderedIds: number[]) => void | Promise<void>,
 * }} props
 */
export function DraggableCheckInRoster({
    players,
    disabled = false,
    sessionActive = false,
    currentUserId = null,
    busy = false,
    showSkillLevel = true,
    playerStatus,
    canEditPlayer,
    canRemovePlayer,
    onEdit,
    onRemove,
    onReorder,
}) {
    const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
    const [orderedPlayers, setOrderedPlayers] = useState(players);
    const [activeId, setActiveId] = useState(/** @type {string | null} */ (null));

    useEffect(() => {
        setOrderedPlayers(players);
    }, [players]);

    useDragScrollLock(activeId != null, rootRef);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const sortable = !disabled && orderedPlayers.length >= 2;

    const activePlayer = useMemo(() => {
        if (activeId == null) return null;
        return orderedPlayers.find((p) => String(p.id) === activeId) ?? null;
    }, [activeId, orderedPlayers]);

    /**
     * @param {import('@dnd-kit/core').DragEndEvent} event
     */
    function handleDragEnd(event) {
        setActiveId(null);
        if (!sortable) return;

        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = orderedPlayers.findIndex((p) => String(p.id) === String(active.id));
        const newIndex = orderedPlayers.findIndex((p) => String(p.id) === String(over.id));
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

        const next = arrayMove(orderedPlayers, oldIndex, newIndex);
        setOrderedPlayers(next);
        void onReorder(next.map((p) => Number(p.id)));
    }

    if (!sortable) {
        return (
            <div className="rt-roster-player-cards-grid rt-roster-player-cards-grid--check-in">
                {orderedPlayers.map((p, index) => (
                    <QueueingSessionPlayerCard
                        key={p.id}
                        player={p}
                        status={playerStatus(p)}
                        position={index + 1}
                        sessionActive={sessionActive}
                        isYou={currentUserId != null && p.user?.id === currentUserId}
                        canEdit={canEditPlayer(p)}
                        canRemove={canRemovePlayer(p)}
                        busy={busy}
                        showSkillLevel={showSkillLevel}
                        style={{
                            animationDelay: `${0.08 + (index % 10) * 0.04}s`,
                        }}
                        onEdit={() => onEdit(p)}
                        onRemove={() => onRemove(p)}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            ref={rootRef}
            className={['rt-roster-check-in-dnd', activeId != null ? 'rt-roster-check-in-dnd--dragging' : '']
                .filter(Boolean)
                .join(' ')}
        >
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                autoScroll={false}
                onDragStart={(event) => {
                    setActiveId(String(event.active.id));
                }}
                onDragCancel={() => setActiveId(null)}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={orderedPlayers.map((p) => String(p.id))}
                    strategy={rectSortingStrategy}
                >
                    <div className="rt-roster-player-cards-grid rt-roster-player-cards-grid--check-in rt-roster-player-cards-grid--sortable">
                        {orderedPlayers.map((p, index) => (
                            <SortableCheckInCard
                                key={p.id}
                                player={p}
                                index={index}
                                disabled={busy}
                                sessionActive={sessionActive}
                                isYou={currentUserId != null && p.user?.id === currentUserId}
                                canEdit={canEditPlayer(p)}
                                canRemove={canRemovePlayer(p)}
                                busy={busy}
                                showSkillLevel={showSkillLevel}
                                status={playerStatus(p)}
                                onEdit={() => onEdit(p)}
                                onRemove={() => onRemove(p)}
                            />
                        ))}
                    </div>
                </SortableContext>

                <PortaledDragOverlay>
                    {activePlayer ? (
                        <div className="w-[min(100vw-2rem,20rem)] opacity-95 shadow-xl">
                            <QueueingSessionPlayerCard
                                player={activePlayer}
                                status={playerStatus(activePlayer)}
                                position={
                                    orderedPlayers.findIndex((p) => p.id === activePlayer.id) + 1 || null
                                }
                                sessionActive={sessionActive}
                                isYou={currentUserId != null && activePlayer.user?.id === currentUserId}
                                canEdit={false}
                                canRemove={false}
                                showSkillLevel={showSkillLevel}
                                sortable
                                isDragging
                            />
                        </div>
                    ) : null}
                </PortaledDragOverlay>
            </DndContext>
            <p className="sr-only">
                Hold and drag a check-in card to reorder who arrived first. Current order:{' '}
                {orderedPlayers.map((p) => rosterPlayerName(p)).join(', ')}.
            </p>
        </div>
    );
}
