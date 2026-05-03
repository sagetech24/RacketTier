import { useState } from 'react';
import '../../css/dashboard-v2.css';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav.jsx';
import { DashboardV2Header } from '../components/dashboard/DashboardV2Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const IMG_RANK_1 =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDkcQuiUlDak7Nu3Km_tS0d01_vv6THE8fHhOP5oPj1U52fnKuny7ig-uPHQqa-qd3GM8hCyDa8isv_EmRqWUV_wlWirMOf1cxDKaTZHJM_1n078IZ8L0UmYVSOURgLy5iiajqQZ_Fzs4EUdLObYuL_iEakJiSETsnzEunPkJ0Riwot38IGZXzeY7UD77eGpDfWSdPc4ERVB-_n8k7XRVjQljbvwl6bqZEXL1eVy9D2zMw7ASe8vutxK9B8hTrdee1xEX-GMowYgm4';

const IMG_RANK_2 =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD6h_I42Km1gHaB7pbjzDdlmhf53baL3DjYFEVdCilPKFhGoyHkiSIritotA4TxXdk2KiqVlFZC9gi7-2yyxknEU4M2KcRSWxlAWGZuC-V2WuTvIjmeeu_AETYk0-Y1xdtUpeUOl55-msjaCLFJUhXq5zTb3R6VEhch8Nx9NFUYOzx4uLqlOHibCLNaEoZ8oZU0TRjKaz-u_6JPitcMQoyTs5JcOMMg6TIN9avvWM4aP0AYkaAPse1131eSUSEPjClK6cWlS7KNjjs';

const IMG_RANK_3 =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBV2cYZ0Eo5A08XIKuPloaAeGWTQLgEEULKJUid9cMye4ZJH04V8g_U1bxqgHcmF5i-sCkQjOwItCkvxycrUTMnjbNWacBXy9q9E8A9QI_7UNrKwTNgnVBaiRXCU1wfECJTlRWKLiVADb12-ZZkw2nOBkm13wlyg57IxT5lNrIdR475Bj0NqdJDrej8kf7p1lVyqDGZxR7bUVnIvHlfVShvo2W300CLSOQWznZQPoMv5bKfMgAqdg3p-4a_2vgSDbeJXutoFEiLUI0';

const IMG_RANK_4 =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuANo_6whauMBZEh_PczyqN_q3wjU4-TULrnMg17_hcIdliNB-GGuz9g7sGGs0t5eytYV5riikZcN-k50KW2aRTRqGveHpdxOUvjXoMxjjZtb5_hZ17Ulc-GiuhhLfAJeXC6dtGSHd4ZWaydh9hMYsYZbIoQBAkhLtRqC0n2PrC6Opbmck9ze9MOw5qm0kPn0WuY92oz5uBViV4ygZV7567_hl83IndfWkiH_vqNiQA-aG7rkNGo7PpAgZ6XBoKPCqGUCbF7-tQg_ck';

const IMG_RANK_5 =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCGXx63ExYxiW_vAq2DtZzfsPJzpkWcUX0314EnmKVKPIORbx0mydvGwI1OS-80YLdSZ4ad1qHQDY23_MOLLBW016JBzoJUBof8lLl6CucR5SZxsFTYml5s3A7u59nQjOQdFe4yTL1exVhqXkH4Kr1f8M8gON79_6W-igB6IXHq9nCFK0T5ZXMBOGoxO9REfCuoBib7Ic2IoFKk9Xd4z8AJphirdoqpWFqfO6xqbaXa6qULxvLiUvbClNRr1sgzDWDeJiUMeZx7p6k';

const IMG_RANK_6 =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDvmBLoDUcugvTWF3Gad7p_v5OdTvoVO5nEsEcbaiir5C3Tm1aevA8Q3mg4u0jO336yMTUZwJum443uDSh0khBxIvaNKKdP_fce2G8jYhIj_CuI5-56-o6Q_EYi302HJB1xjKrj93-mWZbSAGMY-JKAGWKmQnggqGy63m8tiOSDiPvajr5raswEOVH2yEkoL4n8pCGCXLoYwrPex1WyaXREf_q-FFc7ui-h9BqtQ30gvmqDCoGcBJqINLz1PJGtocwkBJnfgtumKCc';

const FILTERS = ['Global', 'Regional', 'Under-21', 'Masters'];

export function RankingPage() {
    const { user } = useAuth();
    const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

    return (
        <div className="min-h-[max(884px,100dvh)] bg-[#131316] pb-24 text-[#e4e1e6] selection:bg-[#c2c1ff] selection:text-[#282671]">
            <DashboardV2Header user={user} profileLoading={false} />

            <main className="mx-auto max-w-md px-6 pt-20">
                <section className="mb-10 mt-8">
                    <h2 className="text-4xl font-extrabold tracking-tighter text-[#e4e1e6]">Rankings</h2>
                    <p className="mt-4 max-w-[80%] text-sm leading-relaxed text-[#c8c5d2]">
                        Live updates for the global season. Performance metrics based on the Tier-1 algorithm.
                    </p>
                </section>

                <div className="mb-8 flex flex-col gap-4">
                    <div className="group relative">
                        <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-[#918f9c]">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="size-6"
                                aria-hidden
                            >
                                <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            placeholder="Search players..."
                            className="w-full rounded-xl border border-[#353438] bg-[#0e0e11] py-4 pl-12 pr-4 text-sm text-[#e4e1e6] transition-all placeholder:text-[#918f9c] focus:ring-1 focus:ring-[#c2c1ff]/20"
                            aria-label="Search players"
                        />
                    </div>
                    <div className="rt-scroll-inline flex gap-2 overflow-x-auto pb-2">
                        {FILTERS.map((label) => {
                            const isActive = activeFilter === label;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => setActiveFilter(label)}
                                    className={
                                        isActive
                                            ? 'shrink-0 rounded-full bg-[#4ce081] px-5 py-2 text-xs font-bold whitespace-nowrap text-[#003919]'
                                            : 'shrink-0 cursor-pointer rounded-full bg-[#353438] px-5 py-2 text-xs font-medium whitespace-nowrap text-[#e4e1e6] transition-colors hover:bg-[#1f1f22]'
                                    }
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="overflow-hidden rounded-xl bg-linear-to-br from-[#c2c1ff]/10 to-transparent p-px">
                        <div className="relative flex items-center gap-4 rounded-xl bg-[#1f1f22] p-4">
                            <div className="min-w-12 text-4xl font-extrabold italic text-[#c2c1ff]/40">01</div>
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#353438]">
                                <img alt="" src={IMG_RANK_1} className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-[#e4e1e6]">Alex Sokolov</h3>
                                <p className="text-[10px] uppercase tracking-widest text-[#c8c5d2]">34 W — 2 L</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-[#e4e1e6]">14,250</div>
                                <div className="text-[10px] font-bold text-[#4ce081]">+240</div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl bg-linear-to-br from-[#4ce081]/5 to-transparent p-px">
                        <div className="flex items-center gap-4 rounded-xl bg-[#1f1f22] p-4">
                            <div className="min-w-12 text-4xl font-extrabold italic text-[#c8c5d2]/20">02</div>
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#353438]">
                                <img alt="" src={IMG_RANK_2} className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-[#e4e1e6]">Elena Moretti</h3>
                                <p className="text-[10px] uppercase tracking-widest text-[#c8c5d2]">31 W — 5 L</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-[#e4e1e6]">12,890</div>
                                <div className="text-[10px] font-medium text-[#c8c5d2]">--</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-xl bg-[#1f1f22] p-4">
                        <div className="min-w-12 text-4xl font-extrabold italic text-[#c8c5d2]/10">03</div>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#353438]">
                            <img alt="" src={IMG_RANK_3} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-[#e4e1e6]">Jordan Lee</h3>
                            <p className="text-[10px] uppercase tracking-widest text-[#c8c5d2]">28 W — 7 L</p>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-[#e4e1e6]">11,400</div>
                            <div className="text-[10px] font-bold text-[#ffb4ab]">-110</div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col">
                        {[
                            { rank: '4', name: 'Ryuji Kim', meta: '25W-10L', tag: 'KR', score: '9,820', img: IMG_RANK_4 },
                            { rank: '5', name: 'Carlos Perez', meta: '24W-12L', tag: 'ES', score: '9,540', img: IMG_RANK_5 },
                            { rank: '6', name: 'Sarah White', meta: '22W-14L', tag: 'AU', score: '8,910', img: IMG_RANK_6 },
                        ].map((row) => (
                            <div
                                key={row.rank}
                                className="group flex items-center gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-[#1b1b1e]"
                            >
                                <div className="w-10 shrink-0 text-center font-bold text-[#c8c5d2] transition-colors group-hover:text-[#c2c1ff]">
                                    {row.rank}
                                </div>
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#1b1b1e]">
                                    <img alt="" src={row.img} className="h-full w-full object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-[#e4e1e6]">{row.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-[#c8c5d2]">{row.meta}</span>
                                        <span className="h-1 w-1 shrink-0 rounded-full bg-[#474651]" />
                                        <span className="text-[10px] text-[#c8c5d2]">{row.tag}</span>
                                    </div>
                                </div>
                                <div className="pr-2 text-right">
                                    <div className="text-sm font-bold text-[#e4e1e6]">{row.score}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="mt-8 mb-12 w-full rounded-xl bg-[#353438] py-4 text-xs font-bold tracking-widest text-[#e4e1e6] uppercase transition-all hover:bg-[#353438]/90"
                    >
                        View All Athletes
                    </button>
                </div>
            </main>

            <DashboardMobileNav />
        </div>
    );
}
