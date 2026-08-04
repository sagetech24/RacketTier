import { useEffect, useId, useRef } from 'react';
import { MaterialIcon } from '../dashboard/MaterialIcon.jsx';

/**
 * Shared add/edit facility dialog.
 *
 * @param {{
 *   mode: 'add' | 'edit';
 *   open: boolean;
 *   name: string;
 *   address: string;
 *   coverPhoto: string;
 *   submitting: boolean;
 *   error: string;
 *   fieldErrors: Record<string, string[]>;
 *   onNameChange: (value: string) => void;
 *   onAddressChange: (value: string) => void;
 *   onCoverPhotoChange: (value: string) => void;
 *   onClose: () => void;
 *   onSubmit: (e: import('react').FormEvent) => void;
 * }} props
 */
export function FacilityFormModal({
    mode,
    open,
    name,
    address,
    coverPhoto,
    submitting,
    error,
    fieldErrors,
    onNameChange,
    onAddressChange,
    onCoverPhotoChange,
    onClose,
    onSubmit,
}) {
    const titleId = useId();
    const firstFieldRef = useRef(/** @type {HTMLInputElement | null} */ (null));

    useEffect(() => {
        if (!open) return undefined;
        const t = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
        return () => window.clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        function onKeyDown(e) {
            if (e.key === 'Escape' && !submitting) {
                e.preventDefault();
                onClose();
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, submitting, onClose]);

    if (!open) return null;

    const isAdd = mode === 'add';

    return (
        <div
            className="rt-facility-modal-overlay"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !submitting) onClose();
            }}
        >
            <div
                className="rt-facility-modal-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                        <h2 id={titleId} className="text-lg font-bold text-[#e4e1e6]">
                            {isAdd ? 'Add facility' : 'Edit facility'}
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-[#918f9c]">
                            {isAdd
                                ? 'Name and address are required. You can find this venue from search later.'
                                : 'Update the details used for search and game room setup.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rt-facility-modal-close"
                        aria-label="Close"
                    >
                        <MaterialIcon name="close" className="text-xl" />
                    </button>
                </div>

                {error ? (
                    <p className="mb-4 rounded-lg border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 px-3 py-2 text-sm text-[#ffb4ab]" role="alert">
                        {error}
                    </p>
                ) : null}

                <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="space-y-2">
                        <label htmlFor={`${titleId}-name`} className="rt-facility-field-label">
                            Venue name
                        </label>
                        <input
                            id={`${titleId}-name`}
                            ref={firstFieldRef}
                            required
                            value={name}
                            onChange={(e) => onNameChange(e.target.value)}
                            className="rt-facility-field"
                            placeholder="e.g. Riverside Sports Center"
                            autoComplete="organization"
                        />
                        {fieldErrors.name?.[0] ? <p className="text-xs text-[#ffb4ab]">{fieldErrors.name[0]}</p> : null}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor={`${titleId}-address`} className="rt-facility-field-label">
                            Address
                        </label>
                        <textarea
                            id={`${titleId}-address`}
                            required
                            value={address}
                            onChange={(e) => onAddressChange(e.target.value)}
                            rows={3}
                            className="rt-facility-field resize-none"
                            placeholder="Street, city, region, postal code"
                            autoComplete="street-address"
                        />
                        {fieldErrors.address?.[0] ? (
                            <p className="text-xs text-[#ffb4ab]">{fieldErrors.address[0]}</p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor={`${titleId}-cover`} className="rt-facility-field-label">
                            Cover photo path
                        </label>
                        <input
                            id={`${titleId}-cover`}
                            value={coverPhoto}
                            onChange={(e) => onCoverPhotoChange(e.target.value)}
                            className="rt-facility-field"
                            placeholder="/images/venue-cover.jpg or https://…"
                        />
                        <p className="text-xs text-[#918f9c]">
                            Optional. Public path or image URL. Leave blank for an initials placeholder.
                        </p>
                        {fieldErrors.cover_photo?.[0] ? (
                            <p className="text-xs text-[#ffb4ab]">{fieldErrors.cover_photo[0]}</p>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="rt-facility-btn rt-facility-btn-ghost min-h-11 px-4"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={[
                                'rt-facility-btn min-h-11 px-5',
                                isAdd ? 'rt-facility-btn-primary' : 'rt-facility-btn-lavender',
                            ].join(' ')}
                        >
                            {submitting ? 'Saving…' : isAdd ? 'Save facility' : 'Save changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
