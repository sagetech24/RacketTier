/**
 * @param {{ isAdmin: boolean }} props
 */
export function AdminRoleBadge({ isAdmin }) {
    return (
        <span
            className={
                isAdmin
                    ? 'inline-flex rounded-full bg-[#c2c1ff]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#c2c1ff]'
                    : 'inline-flex rounded-full border border-white/10 bg-[#26262a] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#c8c5d2]'
            }
        >
            {isAdmin ? 'Admin' : 'Member'}
        </span>
    );
}

/**
 * @param {{ emailVerified: boolean }} props
 */
export function AdminVerifiedBadge({ emailVerified }) {
    return (
        <span
            className={
                emailVerified
                    ? 'inline-flex rounded-full bg-[#4ce081]/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#4ce081]'
                    : 'inline-flex rounded-full border border-white/10 bg-[#26262a] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#918f9c]'
            }
        >
            {emailVerified ? 'Verified' : 'Unverified'}
        </span>
    );
}

/**
 * @param {{
 *   isAdmin: boolean,
 *   emailVerified: boolean,
 * }} props
 */
export function AdminMemberBadges({ isAdmin, emailVerified }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            <AdminRoleBadge isAdmin={isAdmin} />
            <AdminVerifiedBadge emailVerified={emailVerified} />
        </div>
    );
}

/**
 * @param {string | null | undefined} iso
 */
export function formatMemberRegisteredDate(iso) {
    if (!iso) {
        return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
