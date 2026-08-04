import { useEffect, useState } from 'react';
import { MODAL_OVERLAY_CLASS, ModalPortal } from '../app/ModalPortal.jsx';

const PRONOUN_OPTIONS = [
    { value: '', label: 'Select gender' },
    { value: 'He/Him', label: 'He/Him' },
    { value: 'She/Her', label: 'She/Her' },
    { value: 'They/Them', label: 'They/Them' },
    { value: 'Other', label: 'Other' },
];

const SKILL_LEVEL_OPTIONS = [
    { value: '1', label: '1 — Starter' },
    { value: '2', label: '2 — Beginner' },
    { value: '3', label: '3 — Intermediate' },
    { value: '4', label: '4 — Sempai' },
    { value: '5', label: '5 — Sensie' },
];

const inputClassName =
    'w-full rounded-lg border border-[#3c3c3e] bg-[#131316] p-3 text-md text-[#e4e1e6] focus:ring-[#4ce081] focus:ring-1 outline-none disabled:opacity-60';
const labelClassName = 'mb-1 block text-[10px] font-black uppercase tracking-widest text-[#918f9c]';

/**
 * @param {{
 *   open: boolean,
 *   mode: 'guest' | 'member',
 *   intent?: 'add' | 'edit',
 *   member?: { name: string, pronoun?: string | null, skill_level?: number | null } | null,
 *   guest?: { name?: string, pronoun?: string | null, skill_level?: number | null } | null,
 *   optionalGuestSkill?: boolean,
 *   optionalGuestGender?: boolean,
 *   busy?: boolean,
 *   onCancel: () => void,
 *   onConfirm: (payload: { guest_name?: string, pronoun?: string | null, skill_level: number | null }) => void | Promise<void>,
 * }} props
 */
export function AddQueueingSessionPlayerModal({
    open,
    mode,
    intent = 'add',
    member = null,
    guest = null,
    optionalGuestSkill = true,
    optionalGuestGender = true,
    busy = false,
    onCancel,
    onConfirm,
}) {
    const [guestName, setGuestName] = useState('');
    const [pronoun, setPronoun] = useState('');
    const [skillLevel, setSkillLevel] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const isGuest = mode === 'guest';
    const isEdit = intent === 'edit';
    const requireSkill = isGuest ? !optionalGuestSkill : true;
    const requireGender = isGuest ? !optionalGuestGender : false;

    useEffect(() => {
        if (!open) return;

        if (isEdit) {
            if (isGuest) {
                setGuestName(guest?.name ?? '');
                setPronoun(guest?.pronoun ?? '');
                setSkillLevel(guest?.skill_level != null ? String(guest.skill_level) : '');
            } else {
                setGuestName('');
                setPronoun(member?.pronoun ?? '');
                setSkillLevel(member?.skill_level != null ? String(member.skill_level) : '');
            }
        } else {
            setGuestName('');
            setPronoun(isGuest ? '' : (member?.pronoun ?? ''));
            // Members: default from sport tier (passed as skill_level); QM can change.
            setSkillLevel(
                !isGuest && member?.skill_level != null ? String(member.skill_level) : '',
            );
        }

        setSuccessMessage('');
    }, [open, mode, intent, isGuest, isEdit, member?.pronoun, member?.skill_level, guest?.name, guest?.pronoun, guest?.skill_level]);

    useEffect(() => {
        if (!successMessage) return undefined;
        const timer = window.setTimeout(() => setSuccessMessage(''), 4000);
        return () => window.clearTimeout(timer);
    }, [successMessage]);

    if (!open) return null;

    const title = isEdit
        ? isGuest
            ? 'Edit Guest Player'
            : 'Edit Player'
        : isGuest
          ? 'Add a Guest Player'
          : 'Add Player';
    const canSubmit = isGuest
        ? guestName.trim() !== '' &&
          (!requireSkill || skillLevel !== '') &&
          (!requireGender || pronoun !== '')
        : skillLevel !== '';
    const submitLabel = busy
        ? isEdit
            ? 'Saving…'
            : 'Adding…'
        : isEdit
          ? 'Save Changes'
          : 'Add Player';

    async function handleSubmit(e) {
        e.preventDefault();
        if (!canSubmit || busy) return;

        const payload = {
            ...(isGuest ? { guest_name: guestName.trim() } : {}),
            ...(isGuest ? { pronoun: pronoun !== '' ? pronoun : null } : {}),
            skill_level: skillLevel !== '' ? Number(skillLevel) : null,
        };

        try {
            await onConfirm(payload);
            if (!isEdit && isGuest && payload.guest_name) {
                setSuccessMessage(`"${payload.guest_name}" was added to the session.`);
                setGuestName('');
                setPronoun('');
                setSkillLevel('');
            }
        } catch {
            /* Parent surfaces errors via actionError */
        }
    }

    return (
        <ModalPortal open={open}>
            <div className={MODAL_OVERLAY_CLASS}>
                <div className="rt-end-match-modal-sheet w-full max-w-md rounded-2xl border border-[#2a2a2d] bg-[#1b1b1e] p-5 shadow-xl">
                    {successMessage ? (
                        <div
                            role="alert"
                            className="mb-4 rounded-lg border border-[#4ce081]/40 bg-[#4ce081]/10 px-3 py-2 text-sm font-medium text-[#4ce081]"
                        >
                            {successMessage}
                        </div>
                    ) : null}
                    <h3 className="text-lg font-bold text-[#e4e1e6]">{title}</h3>
                {!isGuest && member ? (
                    <p className="mt-2 text-sm text-[#918f9c]">
                        {isEdit ? 'Editing' : 'Adding'}{' '}
                        <span className="font-semibold text-[#e4e1e6]">{member.name}</span>
                        {member.pronoun ? (
                            <>
                                {' '}
                                (<span className="text-[#c2c1ff]">{member.pronoun}</span>)
                            </>
                        ) : null}
                    </p>
                ) : null}

                <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                    {isGuest ? (
                        <>
                            <div>
                                <label htmlFor="rt-add-player-guest-name" className={labelClassName}>
                                    Guest Name
                                </label>
                                <input
                                    id="rt-add-player-guest-name"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    placeholder="Guest player name"
                                    disabled={busy}
                                    className={inputClassName}
                                />
                            </div>
                            <div>
                                <label htmlFor="rt-add-player-pronoun" className={labelClassName}>
                                    Gender{requireGender ? '' : ' (optional)'}
                                </label>
                                <select
                                    id="rt-add-player-pronoun"
                                    value={pronoun}
                                    onChange={(e) => setPronoun(e.target.value)}
                                    disabled={busy}
                                    required={requireGender}
                                    className={inputClassName}
                                >
                                    {PRONOUN_OPTIONS.map((option) => (
                                        <option key={option.value || 'empty'} value={option.value} className="bg-[#131316]">
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : null}

                    <div>
                        <label htmlFor="rt-add-player-skill-level" className={labelClassName}>
                            Tier Level{isGuest && !requireSkill ? ' (optional)' : ''}
                        </label>
                        <select
                            id="rt-add-player-skill-level"
                            value={skillLevel}
                            onChange={(e) => setSkillLevel(e.target.value)}
                            disabled={busy}
                            required={requireSkill}
                            className={inputClassName}
                        >
                            <option value="" className="bg-[#131316]">
                                Select tier level
                            </option>
                            {SKILL_LEVEL_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="bg-[#131316]">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {!isGuest && !isEdit && member?.skill_level != null ? (
                            <p className="mt-1.5 text-[11px] text-[#918f9c]">
                                Pre-filled from this member&apos;s sport tier. You can change it before
                                adding.
                            </p>
                        ) : null}
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onCancel}
                            className="flex-1 rounded-lg border border-white/50 py-2 text-sm font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy || !canSubmit}
                            className="flex-1 rounded-lg bg-[#4ce081] py-2 text-sm font-bold text-[#003919] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </ModalPortal>
    );
}
