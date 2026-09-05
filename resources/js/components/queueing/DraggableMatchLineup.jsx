import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';
import { useDragScrollLock } from '../../hooks/useDragScrollLock.js';
import { maxPlayersPerTeam, moveLineupPlayer } from '../../lib/moveLineupPlayer.js';

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   skill_level?: number | null,
 *   wins_count?: number,
 *   losses_count?: number,
 *   is_guest?: boolean,
 * }} LineupPlayerView
 */

/** @param {number | null | undefined} skillLevel */
function lineupSkillLevelLabel(skillLevel) {
    if (skillLevel == null) return null;
    const level = Math.min(5, Math.max(1, Number(skillLevel)));
    return `Lvl ${level}`;
}

function prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Render DragOverlay on document.body. Lineup modals keep a CSS `transform`
 * after their enter animation (`forwards`), which makes in-tree
 * `position: fixed` resolve against the sheet instead of the viewport — the
 * preview then appears far from the press point, often outside the modal.
 *
 * @param {{
 *   children: import('react').ReactNode,
 * }} props
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
 *   player: LineupPlayerView,
 *   dragProps?: Record<string, unknown>,
 *   dragRef?: ((node: HTMLElement | null) => void) | null,
 *   isDragging?: boolean,
 *   disabled?: boolean,
 *   onRemove?: ((id: number) => void) | null,
 *   showSkillLevel?: boolean,
 * }} props
 */
function LineupDragCard({
    player,
    dragProps = {},
    dragRef = null,
    isDragging = false,
    disabled = false,
    onRemove = null,
    showSkillLevel = true,
}) {
    const skillLabel = showSkillLevel ? lineupSkillLevelLabel(player.skill_level) : null;
    const canDrag = !disabled && Object.keys(dragProps).length > 0;
    const displayName = player.name?.trim() || 'Player';

    return (
        <div
            ref={canDrag ? dragRef : undefined}
            className={[
                'rt-lineup-drag-card flex items-start gap-1 rounded-lg border-2 border-dashed border-[#c2c1ff]/50 bg-[#131316] p-2 shadow-sm select-none md:gap-2 md:p-3',
                canDrag ? 'rt-lineup-drag-card--active' : '',
                isDragging ? 'opacity-60 ring-2 ring-[#c2c1ff]/50' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            draggable={false}
            {...(canDrag ? dragProps : {})}
            onContextMenu={canDrag ? (event) => event.preventDefault() : undefined}
        >
            <div className="flex min-w-0 flex-1 items-start gap-1 md:gap-1 relative">
                {onRemove ? (
                    <button
                        type="button"
                        disabled={disabled}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemove(player.id);
                        }}
                        className="absolute -top-5 -left-4 inline-flex size-6 md:size-8 shrink-0 items-center justify-center rounded-full bg-red-300/30 p-1 text-red-300 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Remove ${displayName}`}
                    >
                        <MaterialIcon name="close" className="text-[16px]! md:text-2xl!" />
                    </button>
                ) : null}
                <div className="min-w-0 flex-1">
                    <p
                        className="min-w-0 truncate text-sm font-semibold capitalize leading-tight text-[#e4e1e6] md:text-lg"
                        title={displayName}
                    >
                        {displayName}
                    </p>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        {skillLabel ? (
                            <p className="inline-flex items-center gap-0.5" title="Skill level">
                                <MaterialIcon name="star" className="text-[15px]! text-[#c2c1ff] md:text-xl!" />
                                <span className="truncate text-xs font-medium text-[#c2c1ff] md:text-lg">
                                    {skillLabel}
                                </span>
                            </p>
                        ) : null}
                        <span className="inline-flex items-center gap-0.5" title="Wins">
                            <MaterialIcon name="arrow_upward" className="text-[13px]! text-[#4ce081] md:text-xl!" />
                            <span className="text-xs font-medium tabular-nums text-[#e4e1e6] md:text-lg">
                                {player.wins_count ?? 0}
                            </span>
                        </span>
                        <span className="inline-flex items-center gap-0.5" title="Losses">
                            <MaterialIcon name="arrow_downward" className="text-[13px]! text-red-300/90 md:text-xl!" />
                            <span className="text-xs font-medium tabular-nums text-[#e4e1e6] md:text-lg">
                                {player.losses_count ?? 0}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * @param {{
 *   player: LineupPlayerView,
 *   disabled?: boolean,
 *   onRemove?: ((id: number) => void) | null,
 *   showSkillLevel?: boolean,
 * }} props
 */
function SortableLineupCard({ player, disabled = false, onRemove = null, showSkillLevel = true }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: String(player.id),
        disabled,
        data: { type: 'player', playerId: player.id },
    });

    const reduceMotion = prefersReducedMotion();
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: reduceMotion ? undefined : transition,
        opacity: isDragging ? 0.35 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <LineupDragCard
                player={player}
                disabled={disabled}
                isDragging={isDragging}
                onRemove={onRemove}
                showSkillLevel={showSkillLevel}
                dragRef={disabled ? null : setActivatorNodeRef}
                dragProps={
                    disabled
                        ? {}
                        : { ...attributes, ...listeners, 'aria-label': `Drag ${player.name?.trim() || 'player'}` }
                }
            />
        </div>
    );
}

/**
 * @param {{
 *   team: 1 | 2,
 *   label: string,
 *   players: LineupPlayerView[],
 *   maxPerTeam: number,
 *   disabled?: boolean,
 *   onRemove?: ((id: number) => void) | null,
 *   showSkillLevel?: boolean,
 * }} props
 */
function TeamColumn({
    team,
    label,
    players,
    maxPerTeam,
    disabled = false,
    onRemove = null,
    showSkillLevel = true,
}) {
    const droppableId = `team-${team}`;
    const { setNodeRef, isOver } = useDroppable({
        id: droppableId,
        data: { type: 'team', team },
        disabled,
    });
    const accent = team === 1 ? 'text-[#4ce081]' : 'text-[#c8c5d2]';
    const ringClass = isOver
        ? team === 1
            ? 'ring-2 ring-[#4ce081]/50'
            : 'ring-2 ring-[#c2c1ff]/50'
        : '';

    return (
        <div className="min-w-0">
            <p className={`mb-1.5 truncate text-[11px] font-bold uppercase tracking-wide md:text-[18px] ${accent}`}>
                {label} ({players.length}/{maxPerTeam})
            </p>
            <div
                ref={setNodeRef}
                className={[
                    'min-h-22 space-y-2 rounded-xl border border-dashed border-[#45454a] bg-[#131316]/60 p-1.5 transition-[box-shadow,border-color] duration-200 ease-out md:p-2',
                    ringClass,
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                <SortableContext items={players.map((p) => String(p.id))} strategy={verticalListSortingStrategy}>
                    {players.map((player) => (
                        <SortableLineupCard
                            key={player.id}
                            player={player}
                            disabled={disabled}
                            onRemove={onRemove}
                            showSkillLevel={showSkillLevel}
                        />
                    ))}
                </SortableContext>
                {players.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-[#918f9c] md:text-sm">Drop player here</p>
                ) : null}
            </div>
        </div>
    );
}

/**
 * @param {{
 *   matchType: 'singles' | 'doubles',
 *   team1: LineupPlayerView[],
 *   team2: LineupPlayerView[],
 *   onChange: (next: { team1: number[], team2: number[] }) => void,
 *   disabled?: boolean,
 *   onRemove?: ((id: number) => void) | null,
 *   title?: string | null,
 *   framed?: boolean,
 *   showSkillLevel?: boolean,
 * }} props
 */
export function DraggableMatchLineup({
    matchType,
    team1,
    team2,
    onChange,
    disabled = false,
    onRemove = null,
    title = 'Match Lineup',
    framed = true,
    showSkillLevel = true,
}) {
    const maxPerTeam = maxPlayersPerTeam(matchType);
    const teamLabel = matchType === 'doubles' ? 'Team' : 'Player';
    const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
    const [activeId, setActiveId] = useState(/** @type {string | null} */ (null));

    useDragScrollLock(activeId != null, rootRef);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const playerById = useMemo(() => {
        /** @type {Map<number, LineupPlayerView>} */
        const map = new Map();
        for (const p of team1) map.set(p.id, p);
        for (const p of team2) map.set(p.id, p);
        return map;
    }, [team1, team2]);

    /** @param {number} playerId */
    function teamOf(playerId) {
        if (team1.some((p) => p.id === playerId)) return /** @type {1} */ (1);
        if (team2.some((p) => p.id === playerId)) return /** @type {2} */ (2);
        return null;
    }

    const activePlayer = activeId != null ? playerById.get(Number(activeId)) ?? null : null;

    /**
     * @param {import('@dnd-kit/core').DragEndEvent} event
     */
    function handleDragEnd(event) {
        setActiveId(null);
        if (disabled) return;

        const { active, over } = event;
        if (!over) return;

        const playerId = Number(active.id);
        if (!Number.isFinite(playerId) || playerId <= 0) return;

        const fromTeam = teamOf(playerId);
        if (fromTeam == null) return;

        const overData = over.data.current;
        /** @type {1 | 2 | null} */
        let toTeam = null;
        /** @type {number | null} */
        let overPlayerId = null;
        /** @type {number | null} */
        let toIndex = null;

        if (overData?.type === 'team') {
            toTeam = overData.team === 2 ? 2 : 1;
            toIndex = toTeam === 1 ? team1.length : team2.length;
        } else {
            overPlayerId = Number(over.id);
            if (!Number.isFinite(overPlayerId)) return;
            toTeam = teamOf(overPlayerId);
            if (toTeam == null) return;
            const list = toTeam === 1 ? team1 : team2;
            toIndex = list.findIndex((p) => p.id === overPlayerId);
        }

        if (toTeam == null) return;
        if (fromTeam === toTeam && overPlayerId === playerId) return;

        const next = moveLineupPlayer(
            { team1: team1.map((p) => p.id), team2: team2.map((p) => p.id) },
            {
                playerId,
                fromTeam,
                toTeam,
                toIndex,
                overPlayerId,
                maxPerTeam,
            },
        );
        onChange(next);
    }

    return (
        <div
            ref={rootRef}
            className={
                framed
                    ? 'rounded-xl border border-[#c2c1ff]/50 bg-[#1b1b1e] p-3 shadow-lg md:p-4'
                    : undefined
            }
        >
            {title ? (
                <div className="mb-3 flex flex-col items-start justify-start md:flex-row md:justify-between">
                    <p className="text-2xl font-semibold text-[#e4e1e6]">{title}</p>
                    <p className="text-sm text-[#bbbbbb]">Hold a card, then drag to move players</p>
                </div>
            ) : (
                <p className="mb-2 text-xs text-[#918f9c] md:text-sm">Hold a card, then drag to move players</p>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(event) => {
                    if (disabled) return;
                    setActiveId(String(event.active.id));
                }}
                onDragCancel={() => setActiveId(null)}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <TeamColumn
                        team={1}
                        label={`${teamLabel} 1`}
                        players={team1}
                        maxPerTeam={maxPerTeam}
                        disabled={disabled}
                        onRemove={onRemove}
                        showSkillLevel={showSkillLevel}
                    />
                    <TeamColumn
                        team={2}
                        label={`${teamLabel} 2`}
                        players={team2}
                        maxPerTeam={maxPerTeam}
                        disabled={disabled}
                        onRemove={onRemove}
                        showSkillLevel={showSkillLevel}
                    />
                </div>

                <PortaledDragOverlay>
                    {activePlayer ? (
                        <div className="w-full opacity-95 shadow-xl">
                            <LineupDragCard player={activePlayer} isDragging disabled showSkillLevel={showSkillLevel} />
                        </div>
                    ) : null}
                </PortaledDragOverlay>
            </DndContext>
        </div>
    );
}
