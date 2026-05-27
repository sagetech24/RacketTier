import { useEffect } from 'react';
import '../../../css/dashboard-v2.css';

/**
 * @param {{ content: string }} props
 */
function LegalDocumentBody({ content }) {
    const blocks = content.trim().split(/\n\n+/);

    return (
        <div className="space-y-4">
            {blocks.map((block, i) => {
                const lines = block
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean);
                if (lines.length === 0) return null;

                const [first, ...rest] = lines;
                const isSectionHeading = rest.length > 0 && first.length < 72 && !first.endsWith('.');

                if (isSectionHeading) {
                    return (
                        <section key={i} className="space-y-2">
                            <h3 className="text-sm font-bold text-[#e4e1e6]">{first}</h3>
                            {rest.map((line, lineIndex) => (
                                <p key={lineIndex} className="text-sm leading-relaxed text-[#c8c5d2]">
                                    {line}
                                </p>
                            ))}
                        </section>
                    );
                }

                return (
                    <p key={i} className="text-sm leading-relaxed text-[#c8c5d2]">
                        {lines.join(' ')}
                    </p>
                );
            })}
        </div>
    );
}

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   content: string,
 *   onClose: () => void,
 * }} props
 */
export function LegalDocumentModal({ open, title, content, onClose }) {
    useEffect(() => {
        if (!open) return undefined;

        function onKeyDown(e) {
            if (e.key === 'Escape') onClose();
        }

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="rt-end-match-modal-overlay fixed inset-0 z-99 flex items-end justify-center p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rt-legal-doc-title"
            onClick={onClose}
        >
            <div
                className="rt-end-match-modal-sheet flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#2a2a2d] bg-[#1b1b1e] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-[#2a2a2d] px-5 py-4">
                    <h2 id="rt-legal-doc-title" className="text-lg font-bold text-[#e4e1e6]">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-[#918f9c] transition-colors hover:bg-[#2a2a2d] hover:text-[#e4e1e6]"
                        aria-label="Close"
                    >
                        Close
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-4">{content ? <LegalDocumentBody content={content} /> : null}</div>
            </div>
        </div>
    );
}
