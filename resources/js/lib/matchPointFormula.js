/** Keep in sync with App\Services\MatchPointFormula and App\Services\LossPointMode. */
export const MATCH_POINT_FORMULA = {
    winBase: 25,
    winMarginCap: 10,
    loss: 8,
};

/**
 * @param {'zero' | 'effort' | 'penalty' | { lossPointMode?: string } | undefined} [options]
 * @returns {number}
 */
export function lossPointsForMode(options = 'effort') {
    const mode =
        typeof options === 'string'
            ? options
            : options && typeof options === 'object'
              ? options.lossPointMode
              : 'effort';

    if (mode === 'zero') return 0;
    if (mode === 'penalty') return -MATCH_POINT_FORMULA.loss;

    return MATCH_POINT_FORMULA.loss;
}

/**
 * @param {'zero' | 'effort' | 'penalty' | { lossPointMode?: string } | undefined} [options]
 */
export function matchPointFormulaLabel(options = 'effort') {
    const maxWin = MATCH_POINT_FORMULA.winBase + MATCH_POINT_FORMULA.winMarginCap;
    const loss = lossPointsForMode(options);
    const lossLabel = loss > 0 ? `+${loss}` : String(loss);

    return `+${MATCH_POINT_FORMULA.winBase}–${maxWin} win / ${lossLabel} loss`;
}
