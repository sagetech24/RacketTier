/**
 * Material Symbols Outlined — requires `resources/css/dashboard-v2.css`.
 *
 * @param {{
 *   name: string;
 *   className?: string;
 *   filled?: boolean;
 * }} props
 */
export function MaterialIcon({ name, className = '', filled = false }) {
    return (
        <span
            className={['material-symbols-outlined', className].filter(Boolean).join(' ')}
            style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
            aria-hidden
        >
            {name}
        </span>
    );
}
