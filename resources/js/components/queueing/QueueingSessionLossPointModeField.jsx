/** @typedef {'zero' | 'effort' | 'penalty'} LossPointMode */

/** @type {readonly { value: LossPointMode, label: string, description: string }[]} */
export const LOSS_POINT_MODE_OPTIONS = [
    {
        value: 'zero',
        label: 'No points for losers (0)',
        description: 'Winners still earn formula points. Losers get 0.',
    },
    {
        value: 'effort',
        label: 'At least give effort points',
        description: 'Losers earn +8 for showing up and competing.',
    },
    {
        value: 'penalty',
        label: 'Negative points',
        description: 'Losers lose 8 points from session and wallet totals.',
    },
];

/**
 * @param {unknown} value
 * @returns {LossPointMode}
 */
export function normalizeLossPointMode(value) {
    if (value === 'zero' || value === 'effort' || value === 'penalty') {
        return value;
    }

    return 'effort';
}

/**
 * @param {{
 *   value: LossPointMode,
 *   onChange: (next: LossPointMode) => void,
 *   disabled?: boolean,
 * }} props
 */
export function QueueingSessionLossPointModeField({ value, onChange, disabled = false }) {
    const selected = normalizeLossPointMode(value);

    return (
        <fieldset disabled={disabled} className="min-w-0">
            <legend className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                Point system for losers
            </legend>
            <div className="space-y-2" role="radiogroup" aria-label="Point system for losers">
                {LOSS_POINT_MODE_OPTIONS.map((option) => {
                    const isSelected = selected === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            disabled={disabled}
                            onClick={() => onChange(option.value)}
                            className={[
                                'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-[background-color,border-color,transform] duration-150 ease-out disabled:opacity-60 active:scale-[0.99]',
                                isSelected
                                    ? 'border-[#4ce081]/70 bg-[#4ce081]/10'
                                    : 'border-[#2a2a2d] bg-[#131316] hover:border-[#4ce081]/40',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2c1ff]/65',
                            ].join(' ')}
                        >
                            <span
                                aria-hidden="true"
                                className={[
                                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                    isSelected ? 'border-[#4ce081] bg-[#4ce081]' : 'border-[#918f9c]/70 bg-transparent',
                                ].join(' ')}
                            >
                                {isSelected ? <span className="h-1.5 w-1.5 rounded-full bg-[#003919]" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold leading-snug text-[#e4e1e6] md:text-base">
                                    {option.label}
                                </span>
                                <span className="mt-1 block text-xs leading-relaxed text-[#918f9c] md:text-sm">
                                    {option.description}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
