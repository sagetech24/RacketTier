import { useId } from 'react';

/**
 * @param {{
 *   checked: boolean;
 *   onChange: (checked: boolean) => void;
 *   disabled?: boolean;
 *   id?: string;
 *   size?: 'sm' | 'md';
 *   className?: string;
 *   'aria-label'?: string;
 * }} props
 */
export function ToggleSwitch({
    checked,
    onChange,
    disabled = false,
    id: idProp,
    size = 'md',
    className = '',
    'aria-label': ariaLabel,
}) {
    const autoId = useId();
    const id = idProp ?? autoId;

    return (
        <span className={['rt-toggle', size === 'sm' ? 'rt-toggle--sm' : '', className].filter(Boolean).join(' ')}>
            <input
                id={id}
                type="checkbox"
                role="switch"
                aria-checked={checked}
                aria-label={ariaLabel}
                className="rt-toggle-input"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="rt-toggle-track" aria-hidden="true">
                <span className="rt-toggle-thumb" />
            </span>
        </span>
    );
}

/**
 * @param {{
 *   checked: boolean;
 *   onChange: (checked: boolean) => void;
 *   label: import('react').ReactNode;
 *   description?: import('react').ReactNode;
 *   disabled?: boolean;
 *   id?: string;
 *   layout?: 'card' | 'inline';
 *   className?: string;
 * }} props
 */
export function ToggleField({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    id: idProp,
    layout = 'card',
    className = '',
}) {
    const autoId = useId();
    const id = idProp ?? autoId;

    return (
        <label
            htmlFor={id}
            className={[
                'rt-toggle-field',
                layout === 'card' ? 'rt-toggle-field--card' : 'rt-toggle-field--inline',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <ToggleSwitch
                id={id}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className={layout === 'card' ? 'mt-0.5' : ''}
            />
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-[#e4e1e6]">{label}</span>
                {description ? (
                    <span className="mt-1 block text-xs leading-relaxed text-[#918f9c]">{description}</span>
                ) : null}
            </span>
        </label>
    );
}
