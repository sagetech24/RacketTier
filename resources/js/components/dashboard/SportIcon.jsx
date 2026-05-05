import { useState } from 'react';
import { MaterialIcon } from './MaterialIcon.jsx';
import { publicSportImageSrc } from '../../lib/sportIcon.js';

/**
 * Renders `/public/images/{icon}` when the file exists; otherwise falls back to Material Symbols (legacy `sports_*` names).
 *
 * @param {{
 *   icon: string,
 *   className?: string,
 *   filled?: boolean,
 *   selected?: boolean,
 *   imgClassName?: string,
 *   materialClassName?: string,
 * }} props
 */
export function SportIcon({
    icon,
    className = '',
    filled = false,
    selected = false,
    imgClassName,
    materialClassName,
}) {
    const src = publicSportImageSrc(icon);
    const [broken, setBroken] = useState(false);
    const showImg = Boolean(src && !broken);

    const materialClass = materialClassName
        ? [materialClassName, className].filter(Boolean).join(' ')
        : [
              selected ? 'text-4xl text-[#003919]' : 'text-4xl text-[#c2c1ff]',
              className,
          ]
              .filter(Boolean)
              .join(' ');

    const imageClass = [
        imgClassName ?? 'h-10 w-10 object-contain',
        selected ? 'invert' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    if (showImg) {
        return (
            <img
                src={src}
                alt=""
                className={imageClass}
                onError={() => setBroken(true)}
                draggable={false}
                aria-hidden
            />
        );
    }

    return <MaterialIcon name={icon} className={materialClass} filled={filled} />;
}
