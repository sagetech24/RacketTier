/**
 * Labeled auth select with shared input styling.
 *
 * @param {{
 *   id: string,
 *   label: string,
 *   value: string,
 *   onChange: (e: import('react').ChangeEvent<HTMLSelectElement>) => void,
 *   options: Array<{ value: string, label: string }>,
 *   error?: string,
 *   disabled?: boolean,
 *   required?: boolean,
 *   className?: string,
 * }} props
 */
export function AuthSelect({
    id,
    label,
    value,
    onChange,
    options,
    error,
    disabled = false,
    required = false,
    className = '',
}) {
    const hasError = Boolean(error);

    return (
        <div className={['space-y-2', className].filter(Boolean).join(' ')}>
            {label ? (
                <label htmlFor={id} className="ml-1 block text-xs font-medium uppercase tracking-[0.15em] text-[#c8c5d2]">
                    {label}
                </label>
            ) : null}
            <select
                id={id}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? `${id}-error` : undefined}
                className={[
                    'rt-auth-input rt-auth-select w-full rounded-xl px-4 py-3.5 text-[#e4e1e6] outline-none disabled:cursor-not-allowed disabled:opacity-60',
                    hasError ? 'rt-auth-input--error' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                {options.map((option) => (
                    <option key={option.value || 'empty'} value={option.value} className="bg-[#0e0e11] text-[#e4e1e6]">
                        {option.label}
                    </option>
                ))}
            </select>
            {hasError ? (
                <p id={`${id}-error`} className="text-sm text-[#ffb4ab]" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
