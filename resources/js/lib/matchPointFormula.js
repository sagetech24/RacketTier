/** Keep in sync with App\Services\MatchPointFormula. */
export const MATCH_POINT_FORMULA = {
    winBase: 25,
    winMarginCap: 10,
    loss: 8,
};

/**
 * @param {{ zeroLossPoints?: boolean } | boolean} [options]
 */
export function matchPointFormulaLabel(options = false) {
    const zeroLossPoints =
        typeof options === 'boolean' ? options : Boolean(options?.zeroLossPoints);
    const maxWin = MATCH_POINT_FORMULA.winBase + MATCH_POINT_FORMULA.winMarginCap;
    const loss = zeroLossPoints ? 0 : MATCH_POINT_FORMULA.loss;

    return `+${MATCH_POINT_FORMULA.winBase}–${maxWin} win / +${loss} loss`;
}
