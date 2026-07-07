import { ToggleField } from '../app/ToggleSwitch.jsx';

/**
 * @param {{ checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean }} props
 */
export function QueueingSessionSkipScoresField({ checked, onChange, disabled = false }) {
    return (
        <ToggleField
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            layout="card"
            label="Skip Score Entry"
            description="When finishing a match, pick the winning team instead of entering scores."
        />
    );
}
