const CROWN_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

/** @param {{ place?: number; className?: string }} props */
export function RankingCrownIcon({ place = 0, className = '' }) {
    const color = CROWN_COLORS[place] ?? CROWN_COLORS[2];

    return (
        <svg
            className={['opacity-80', className].filter(Boolean).join(' ')}
            fill={color}
            height="20"
            width="20"
            viewBox="0 0 246.001 246.001"
            aria-hidden="true"
        >
            <path d="M211.667,238.5c0,4.142-3.358,7.5-7.5,7.5h-163c-4.142,0-7.5-3.358-7.5-7.5v-16c0-4.142,3.358-7.5,7.5-7.5h163 c4.142,0,7.5,3.358,7.5,7.5V238.5z M241.748,0.74c-3.043-1.458-6.683-0.71-8.899,1.83l-59.492,68.199l-44.08-67.375 C127.891,1.277,125.53,0,123,0s-4.891,1.276-6.276,3.394L72.627,70.795L13.137,3.012C10.914,0.481,7.277-0.26,4.24,1.204 c-3.034,1.465-4.72,4.773-4.12,8.089l33,182.541c0.645,3.57,3.752,6.166,7.38,6.166h165c3.629,0,6.737-2.598,7.381-6.169l33-183 C246.48,5.512,244.788,2.2,241.748,0.74z" />
        </svg>
    );
}

export { CROWN_COLORS };
