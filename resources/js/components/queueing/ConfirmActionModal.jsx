import { MODAL_OVERLAY_CLASS, ModalPortal } from '../app/ModalPortal.jsx';

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: string,
 *   children?: import('react').ReactNode,
 *   cancelLabel?: string,
 *   confirmLabel: string,
 *   confirmBusyLabel?: string,
 *   busy?: boolean,
 *   confirmDisabled?: boolean,
 *   confirmClassName?: string,
 *   onCancel: () => void,
 *   onConfirm: () => void,
 * }} props
 */
export function ConfirmActionModal({
    open,
    title,
    description,
    children,
    cancelLabel = 'Cancel',
    confirmLabel,
    confirmBusyLabel,
    busy = false,
    confirmDisabled = false,
    confirmClassName = 'flex-1 rounded-lg bg-red-500/90 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50',
    onCancel,
    onConfirm,
}) {
    return (
        <ModalPortal open={open}>
            <div className={MODAL_OVERLAY_CLASS} role="presentation">
                <div
                    className="rt-end-match-modal-sheet w-full max-w-md rounded-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rt-confirm-action-title"
                >
                    <h3 id="rt-confirm-action-title" className="text-lg font-bold text-red-300">
                        {title}
                    </h3>
                    {description ? <p className="mt-2 text-sm text-[#918f9c]">{description}</p> : null}
                    {children}
                    <div className="mt-5 flex gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onCancel}
                            className="flex-1 cursor-pointer rounded-lg border border-white/50 py-2 text-sm font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            disabled={busy || confirmDisabled}
                            onClick={onConfirm}
                            className={`cursor-pointer ${confirmClassName}`}
                        >
                            {busy && confirmBusyLabel ? confirmBusyLabel : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
