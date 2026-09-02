import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
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
 *   isDragging?: boolean,
 *   disabled?: boolean,
 *   onRemove?: ((id: number) => void) | null,
 *   showSkillLevel?: boolean,
 * }} props
 */
function LineupDragCard({
    player,
    dragProps = {},
    isDragging = false,
    disabled = false,
    onRemove = null,
    showSkillLevel = true,
}) {
    const skillLabel = showSkillLevel ? lineupSkillLevelLabel(player.skill_level) : null;
    const canDrag = !disabled && Object.keys(dragProps).length > 0;

    return (
        <div
            className={[
                'flex items-start justify-between gap-2 rounded-lg border border-[#c2c1ff]/30 bg-[#131316] p-3 shadow-sm',
                canDrag ? 'cursor-grab select-none active:cursor-grabbing' : '',
                isDragging ? 'opacity-60 ring-2 ring-[#c2c1ff]/50' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            {...(canDrag ? dragProps : {})}
        >
            <div className="flex min-w-0 flex-1 items-start gap-1.5">
                <span
                    className="mt-0.5 shrink-0 text-[#918f9c] pointer-events-none"
                    aria-hidden
                >
                    <MaterialIcon name="drag_indicator" className="text-[20px]! md:text-2xl!" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="mb-1 truncate text-sm font-semibold capitalize text-[#e4e1e6] md:text-lg">
                            {player.name}
                        </p>
                        {player.is_guest ? (
                            <span
                                className="rounded-full border border-[#747374] bg-[#c2c1ff]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c8c5d2] md:text-[12px]"
                                title="Guest player"
                            >
                                Guest
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
            {onRemove ? (
                <button
                    type="button"
                    disabled={disabled}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove(player.id);
                    }}
                    className="inline-flex shrink-0 items-center justify-center text-red-300/70 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Remove ${player.name}`}
                >
                    <MaterialIcon name="close" className="text-[16px]! md:text-2xl!" />
                </button>
            ) : null}
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
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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
                dragProps={disabled ? {} : { ...attributes, ...listeners, 'aria-label': `Drag ${player.name}` }}
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
            <p className={`mb-1.5 text-[12px] font-bold uppercase tracking-wide md:text-[18px] ${accent}`}>
                {label} ({players.length}/{maxPerTeam})
            </p>
            <div
                ref={setNodeRef}
                className={[
                    'min-h-[88px] space-y-2 rounded-xl border border-dashed border-[#45454a] bg-[#131316]/60 p-2 transition-[box-shadow,border-color] duration-200 ease-out',
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
    const [activeId, setActiveId] = useState(/** @type {string | null} */ (null));

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
            className={
                framed
                    ? 'rounded-xl border border-[#c2c1ff]/50 bg-[#1b1b1e] p-4 shadow-lg'
                    : undefined
            }
        >
            {title ? (
                <div className="flex md:flex-row flex-col items-start justify-start md:justify-between mb-3">
                    <p className="text-2xl font-semibold text-[#e4e1e6]">{title}</p>
                    <p className="text-sm text-[#bbbbbb]">Drag and drop players to reorder</p>
                </div>
            ) : null}

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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-2">
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
