export function AuthBrandHeader({ className = '' }) {
    return (
        <div className={['space-y-4 text-center', className].filter(Boolean).join(' ')}>
            <div className="inline-flex items-center justify-center">
                <img src="/images/rt-logo.png" alt="RacketTier" className="h-11 w-11" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-[#c2c1ff]">
                Racket<span className="italic font-extrabold tracking-tighter ml-[0.15rem]">Tier</span>
            </h1>
            <p className="font-medium tracking-tight text-zinc-200 w-2/3 mx-auto">
                Welcome to the kinetic world of racket sports where every smash counts.
            </p>
        </div>
    );
}
