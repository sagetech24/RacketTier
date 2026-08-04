/**
 * Shared step chrome for the auto-match criteria → proposals flow.
 *
 * @param {{
 *   active: 'criteria' | 'proposals',
 *   onCriteriaClick?: () => void,
 *   criteriaDisabled?: boolean,
 * }} props
 */
export function AutoMatchWizardSteps({ active, onCriteriaClick, criteriaDisabled = false }) {
    const criteriaActive = active === 'criteria';
    const proposalsActive = active === 'proposals';

    return (
        <nav aria-label="Auto-match steps" className="mb-4">
            <ol className="flex items-center gap-2">
                <li className="min-w-0 flex-1">
                    <button
                        type="button"
                        disabled={criteriaDisabled || !onCriteriaClick || criteriaActive}
                        onClick={onCriteriaClick}
                        className={[
                            'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-200',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2c1ff]/60',
                            'disabled:cursor-default',
                            criteriaActive
                                ? 'bg-[#c2c1ff]/15 text-[#c2c1ff]'
                                : onCriteriaClick && !criteriaDisabled
                                  ? 'bg-[#131316] text-[#c8c5d2] hover:bg-[#2a2a2d]'
                                  : 'bg-[#131316] text-[#918f9c]',
                        ].join(' ')}
                        aria-current={criteriaActive ? 'step' : undefined}
                    >
                        <span
                            className={[
                                'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                                criteriaActive
                                    ? 'bg-[#c2c1ff] text-[#211e6a]'
                                    : 'bg-[#2a2a2d] text-[#918f9c]',
                            ].join(' ')}
                        >
                            1
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">Criteria</span>
                            <span className="block truncate text-[10px] opacity-80">How to pair</span>
                        </span>
                    </button>
                </li>
                <li className="shrink-0 text-[#45454a]" aria-hidden>
                    →
                </li>
                <li className="min-w-0 flex-1">
                    <div
                        className={[
                            'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left',
                            proposalsActive
                                ? 'bg-[#4ce081]/15 text-[#4ce081]'
                                : 'bg-[#131316] text-[#918f9c]',
                        ].join(' ')}
                        aria-current={proposalsActive ? 'step' : undefined}
                    >
                        <span
                            className={[
                                'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                                proposalsActive
                                    ? 'bg-[#4ce081] text-[#003919]'
                                    : 'bg-[#2a2a2d] text-[#918f9c]',
                            ].join(' ')}
                        >
                            2
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">Suggestions</span>
                            <span className="block truncate text-[10px] opacity-80">Review & queue</span>
                        </span>
                    </div>
                </li>
            </ol>
        </nav>
    );
}
