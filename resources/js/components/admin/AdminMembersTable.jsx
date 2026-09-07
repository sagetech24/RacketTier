import { AdminMemberBadges, AdminRoleBadge, AdminVerifiedBadge, formatMemberRegisteredDate } from './AdminMemberBadges.jsx';

/**
 * @param {{ members: import('../../api/adminMembers.js').AdminMemberRow[] }} props
 */
export function AdminMembersTable({ members }) {
    return (
        <>
            <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-[#1b1b1e] md:hidden">
                {members.map((member) => (
                    <article key={member.id} className="px-4 py-4">
                        <h3 className="truncate text-base font-bold text-[#e4e1e6]">{member.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-[#918f9c]">{member.email}</p>
                        <div className="mt-3">
                            <AdminMemberBadges isAdmin={member.is_admin} emailVerified={member.email_verified} />
                        </div>
                        <p className="mt-2 text-xs text-[#918f9c]">
                            Registered {formatMemberRegisteredDate(member.member_since)}
                            {member.member_since_human ? ` · ${member.member_since_human}` : ''}
                        </p>
                    </article>
                ))}
            </div>

            <div className="rt-admin-members-table hidden overflow-x-auto rounded-xl border border-[#45454a] bg-[#1b1b1e] md:block">
                <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead>
                        <tr className="border-b border-[#45454a] text-[11px] font-bold uppercase tracking-wide text-[#918f9c]">
                            <th scope="col" className="px-4 py-3">
                                Name
                            </th>
                            <th scope="col" className="px-4 py-3">
                                Registered
                            </th>
                            <th scope="col" className="px-4 py-3">
                                Role
                            </th>
                            <th scope="col" className="px-4 py-3">
                                Email status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member) => (
                            <tr key={member.id} className="rt-admin-members-row border-b border-[#2a2a2d] last:border-b-0">
                                <td className="px-4 py-3 align-middle">
                                    <div className="text-sm font-semibold text-[#e4e1e6]">{member.name}</div>
                                    <div className="mt-0.5 truncate text-xs text-[#918f9c]">{member.email}</div>
                                </td>
                                <td className="px-4 py-3 align-middle text-sm tabular-nums text-[#c8c5d2]">
                                    <div>{formatMemberRegisteredDate(member.member_since)}</div>
                                    {member.member_since_human ? (
                                        <div className="text-xs text-[#918f9c]">{member.member_since_human}</div>
                                    ) : null}
                                </td>
                                <td className="px-4 py-3 align-middle">
                                    <AdminRoleBadge isAdmin={member.is_admin} />
                                </td>
                                <td className="px-4 py-3 align-middle">
                                    <AdminVerifiedBadge emailVerified={member.email_verified} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
