import { ToggleField } from '../app/ToggleSwitch.jsx';

/**
 * @param {{ checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean }} props
 */
export function QueueingSessionZeroLossPointsField({ checked, onChange, disabled = false }) {
    return (
        <ToggleField
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            layout="card"
            label="No points for losers"
            description="Winners still earn formula points. Losers get 0 instead of 8."
        />
    );
}
