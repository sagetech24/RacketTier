import { ToggleField } from '../app/ToggleSwitch.jsx';

/**
 * Session stores “optional” flags; these toggles expose the inverse “require” wording.
 *
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
                checked={!optionalGuestSkill}
                onChange={(requireSkill) => onOptionalGuestSkillChange(!requireSkill)}
                disabled={disabled}
                layout="card"
                label="Required skill level"
                description="When on, guests and members must have a tier when joining. Members are pre-filled from their sport tier."
            />
            <ToggleField
                checked={!optionalGuestGender}
                onChange={(requireGender) => onOptionalGuestGenderChange(!requireGender)}
                disabled={disabled}
                layout="card"
                label="Require gender for guest players"
                description="When on, guests must pick a gender/pronoun before joining."
            />
        </div>
    );
}
