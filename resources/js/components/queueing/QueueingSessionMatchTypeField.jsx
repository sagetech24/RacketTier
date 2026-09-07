const MATCH_TYPES = /** @type {const} */ (['singles', 'doubles']);

/**
 * @param {{
 *   value: 'singles' | 'doubles',
 *   onChange: (next: 'singles' | 'doubles') => void,
 *   disabled?: boolean,
 *   hint?: string,
 * }} props
 */
export function QueueingSessionMatchTypeField({ value, onChange, disabled = false, hint }) {
    return (
        <fieldset disabled={disabled} className="min-w-0">
            <legend className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#918f9c]">
                Game type
            </legend>
            <div className="flex" role="group" aria-label="Game type">
                {MATCH_TYPES.map((type) => {
                    const selected = value === type;

                    return (
                        <button
                            key={type}
                            type="button"
                            aria-pressed={selected}
                            disabled={disabled}
                            onClick={() => onChange(type)}
                            className={[
                                'flex-1 py-2.5 text-sm transition-[background-color,color,border-color,transform] duration-150 ease-out disabled:opacity-60 active:scale-[0.98]',
                                type === 'singles' ? 'rounded-l-lg' : 'rounded-r-lg',
                                selected
                                    ? 'bg-[#4ce081] font-bold text-[#003919]'
                                    : 'border border-[#2a2a2d] bg-[#131316] font-semibold text-[#e4e1e6] hover:border-[#4ce081]/40',
                                'focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2c1ff]/65',
                            ].join(' ')}
                        >
                            {type === 'singles' ? 'Singles' : 'Doubles'}
                        </button>
                    );
                })}
            </div>
            {hint ? <p className="mt-1.5 text-xs leading-snug text-[#918f9c]">{hint}</p> : null}
        </fieldset>
    );
}
