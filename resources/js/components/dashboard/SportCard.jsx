import { MaterialIcon } from './MaterialIcon.jsx';

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
                    : 'border-2 border-transparent bg-[#1f1f22] hover:border-[#c2c1ff]/30',
            ].join(' ')}
        >
            <div className="mb-8 flex items-start justify-between">
                <MaterialIcon
                    name={icon}
                    className={selected ? 'text-4xl text-[#003919]' : 'text-4xl text-[#c2c1ff]'}
                    filled={selected}
                />
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
                        ? 'text-xl font-extrabold tracking-tight text-[#003919] lg:text-2xl'
                        : 'text-xl font-extrabold tracking-tight text-[#c8c5d2] group-hover:text-[#c2c1ff] lg:text-2xl'
                }
            >
                {name}
            </h3>
        </button>
    );
}
