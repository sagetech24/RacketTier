/**
 * @param {{
 *   title: string;
 *   subtitle?: string;
 *   eyebrow?: string;
 *   action?: import('react').ReactNode;
 *   size?: 'md' | 'lg';
 * }} props
 */
export function PageHeader({ title, subtitle, eyebrow, action, size = 'lg' }) {
    const titleClass =
        size === 'lg'
            ? 'text-4xl font-extrabold tracking-tight text-balance text-[#e4e1e6] md:text-5xl'
            : 'text-2xl font-extrabold tracking-tight text-[#e4e1e6] md:text-3xl';

    return (
        <header className="mb-8 md:mb-10">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    {eyebrow ? (
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#4ce081]">{eyebrow}</p>
                    ) : null}
                    <h1 className={titleClass}>{title}</h1>
                    {subtitle ? (
                        <p className="mt-2 max-w-prose text-sm font-medium leading-relaxed text-[#c8c5d2] md:text-base">
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
        </header>
    );
}
