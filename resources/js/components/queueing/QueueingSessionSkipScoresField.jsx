/**
 * @param {{ checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean }} props
 */
export function QueueingSessionSkipScoresField({ checked, onChange, disabled = false }) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#2a2a2d] bg-[#131316] px-3 py-3">
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 shrink-0"
            />
            <span className="text-sm leading-snug text-[#c8c5d2]">
                <span className="font-semibold text-[#e4e1e6]">Skip score entry</span>
                <span className="mt-1 block text-xs text-[#918f9c]">
                    When finishing a match, pick the winning team instead of entering scores.
                </span>
            </span>
        </label>
    );
}
