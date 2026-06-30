import { SportIcon } from './SportIcon.jsx';

/**
 * @param {{
 *   name: string;
 *   icon: string;
 *   symbol: string;
 *   selected?: boolean;
 *   onClick?: () => void;
 * }} props
 */
export function SportCard({ name, icon, symbol, selected = false, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'group relative w-full cursor-pointer overflow-hidden rounded-xl p-6 text-left transition-all',
                selected
                    ? 'bg-[#c2c1ff]'
                    : 'border-2 border-transparent bg-[#2e2e31] hover:border-[#c2c1ff]/30',
            ].join(' ')}
        >
            <div className="mb-8 flex items-start justify-between">
                <SportIcon icon={icon} selected={selected} filled={selected} />
                <span
                    className={
                        selected
                            ? 'text-[10px] font-bold tracking-widest text-[#003919]'
                            : 'text-[10px] font-bold tracking-widest text-[#c8c5d2] group-hover:text-[#c2c1ff]'
                    }
                >
                    {symbol}
                </span>
            </div>
            <h3
                className={
                    selected
                        ? 'whitespace-nowrap text-base font-extrabold tracking-tight text-[#003919] md:text-sm lg:text-lg xl:text-xl'
                        : 'whitespace-nowrap text-base font-extrabold tracking-tight text-[#c8c5d2] group-hover:text-[#c2c1ff] md:text-sm lg:text-lg xl:text-xl'
                }
            >
                {name}
            </h3>
        </button>
    );
}
