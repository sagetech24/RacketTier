/**
 * Labeled auth input with validation styling.
 */
export function AuthField({
    id,
    label,
    type = 'text',
    value,
    onChange,
    error,
    disabled = false,
    autoComplete,
    placeholder,
    autoFocus = false,
    inputMode,
    trailing,
    className = '',
    required = true,
    name,
    min,
    max,
}) {
    const hasError = Boolean(error);

    return (
        <div className={['space-y-2', className].filter(Boolean).join(' ')}>
            {label ? (
                <label htmlFor={id} className="ml-1 block text-xs font-medium uppercase tracking-[0.15em] text-[#c8c5d2]">
                    {label}
                </label>
            ) : null}
            <div
                className={[
                    'rt-auth-input-wrap relative',
                    hasError ? 'rt-auth-input-wrap--error' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                <input
                    id={id}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    required={required}
                    autoComplete={autoComplete}
                    autoFocus={autoFocus}
                    inputMode={inputMode}
                    disabled={disabled}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    aria-invalid={hasError || undefined}
                    aria-describedby={hasError ? `${id}-error` : undefined}
                    className={[
                        'rt-auth-input w-full rounded-xl px-4 py-3.5 text-[#e4e1e6] outline-none placeholder:text-[#918f9c]/55 disabled:cursor-not-allowed disabled:opacity-60',
                        trailing ? 'pr-12' : '',
                        hasError ? 'rt-auth-input--error' : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                />
                {trailing}
            </div>
            {hasError ? (
                <p id={`${id}-error`} className="text-sm text-[#ffb4ab]" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
