/** Keep in sync with App\Services\MatchPointFormula. */
export const MATCH_POINT_FORMULA = {
    winBase: 25,
    winMarginCap: 10,
    loss: 8,
};

export function matchPointFormulaLabel() {
    const maxWin = MATCH_POINT_FORMULA.winBase + MATCH_POINT_FORMULA.winMarginCap;

    return `+${MATCH_POINT_FORMULA.winBase}–${maxWin} win / +${MATCH_POINT_FORMULA.loss} loss`;
}
