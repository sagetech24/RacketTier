/**
 * @param {1 | 2} teamNo
 * @param {1 | 2 | null} selectedWinningTeam
 */
function cardClass(teamNo, selectedWinningTeam) {
    const base =
        'rt-facility-winner-card min-h-20 rounded-xl p-3 text-left disabled:cursor-not-allowed disabled:opacity-60';
    if (selectedWinningTeam === null) {
        return `${base} border border-[#2a2a2d] bg-[#131316] hover:border-[#4ce081]/40`;
    }
    if (selectedWinningTeam === teamNo) {
        return `${base} border-2 border-[#4ce081] bg-[#4ce081]/15`;
    }
    return `${base} border-2 border-red-400/60 bg-red-400/10`;
}

/**
 * @param {1 | 2} teamNo
 * @param {1 | 2 | null} selectedWinningTeam
 */
function labelClass(teamNo, selectedWinningTeam) {
    if (selectedWinningTeam === null) {
        return teamNo === 1 ? 'text-[#4ce081]' : 'text-[#c2c1ff]';
    }
    if (selectedWinningTeam === teamNo) {
        return 'text-[#4ce081]';
    }
    return 'text-red-400';
}

/**
 * @param {{
 *   team1Names: string[];
 *   team2Names: string[];
 *   selectedWinningTeam: 1 | 2 | null;
 *   onSelect: (team: 1 | 2) => void;
 *   disabled?: boolean;
 *   firstButtonRef?: import('react').Ref<HTMLButtonElement>;
 * }} props
 */
export function FacilityMatchWinnerPicker({
    team1Names,
    team2Names,
    selectedWinningTeam,
    onSelect,
    disabled = false,
    firstButtonRef,
}) {
    const team1Label = team1Names.length > 0 ? team1Names.join(' & ') : 'Team 1';
    const team2Label = team2Names.length > 0 ? team2Names.join(' & ') : 'Team 2';

    return (
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Winning team">
            <button
                ref={firstButtonRef}
                type="button"
                role="radio"
                aria-checked={selectedWinningTeam === 1}
                disabled={disabled}
                onClick={() => onSelect(1)}
                className={cardClass(1, selectedWinningTeam)}
            >
                <p className={`text-xs font-bold uppercase tracking-wide ${labelClass(1, selectedWinningTeam)}`}>
                    Team 1
                    {selectedWinningTeam === 1 ? ' · Winner' : selectedWinningTeam === 2 ? ' · Loser' : ''}
                </p>
                <p
                    className={`mt-1 text-sm capitalize ${
                        selectedWinningTeam === 2 ? 'text-red-300/90' : 'text-[#e4e1e6]'
                    }`}
                >
                    {team1Label}
                </p>
            </button>
            <button
                type="button"
                role="radio"
                aria-checked={selectedWinningTeam === 2}
                disabled={disabled}
                onClick={() => onSelect(2)}
                className={cardClass(2, selectedWinningTeam)}
            >
                <p className={`text-xs font-bold uppercase tracking-wide ${labelClass(2, selectedWinningTeam)}`}>
                    Team 2
                    {selectedWinningTeam === 2 ? ' · Winner' : selectedWinningTeam === 1 ? ' · Loser' : ''}
                </p>
                <p
                    className={`mt-1 text-sm capitalize ${
                        selectedWinningTeam === 1 ? 'text-red-300/90' : 'text-[#e4e1e6]'
                    }`}
                >
                    {team2Label}
                </p>
            </button>
        </div>
    );
}
