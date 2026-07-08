import '../../css/auth.css';

export function AuthBrandHeader({ className = '', eyebrow, tagline }) {
    return (
        <div className={['space-y-4 text-center', className].filter(Boolean).join(' ')}>
            {eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4ce081]">{eyebrow}</p>
            ) : null}
            <div className="inline-flex items-center justify-center gap-4">
                <img src="/images/rt-logo.png" alt="" className="h-10 w-10" />
                <h1 className="text-5xl font-extrabold tracking-tighter text-[#c2c1ff]">
                    Racket<span className="ml-[0.15rem] italic font-extrabold tracking-tighter">Tier</span>
                </h1>
            </div>
            <p className="mx-auto max-w-xs text-pretty text-sm font-medium leading-relaxed tracking-tight text-[#c8c5d2] tab:max-w-sm tab:text-base">
                {tagline ?? 'Welcome to the kinetic world of racket sports where every smash counts.'}
            </p>
        </div>
    );
}
