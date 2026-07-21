import { ToggleField } from '../app/ToggleSwitch.jsx';

/**
 * @param {{
 *   optionalGuestSkill: boolean,
 *   optionalGuestGender: boolean,
 *   onOptionalGuestSkillChange: (checked: boolean) => void,
 *   onOptionalGuestGenderChange: (checked: boolean) => void,
 *   disabled?: boolean,
 * }} props
 */
export function QueueingSessionGuestOptionalFields({
    optionalGuestSkill,
    optionalGuestGender,
    onOptionalGuestSkillChange,
    onOptionalGuestGenderChange,
    disabled = false,
}) {
    return (
        <div className="space-y-3">
            <ToggleField
                checked={optionalGuestSkill}
                onChange={onOptionalGuestSkillChange}
                disabled={disabled}
                layout="card"
                label="Do not require skill level when adding guest player"
                description="Guests can join without a tier level. Turn off to make skill level mandatory."
            />
            <ToggleField
                checked={optionalGuestGender}
                onChange={onOptionalGuestGenderChange}
                disabled={disabled}
                layout="card"
                label="Do not require Gender when adding guest player"
                description="Guests can join without a gender/pronoun. Turn off to make it mandatory."
            />
        </div>
    );
}
