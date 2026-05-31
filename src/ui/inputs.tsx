import type { StackPresetName } from '../model/project';

interface NumberInputProps {
  ariaLabel?: string;
  disabled?: boolean;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}

export function NumberInput({
  ariaLabel,
  disabled,
  step = 1,
  value,
  onChange
}: NumberInputProps) {
  return (
    <input
      aria-label={ariaLabel}
      disabled={disabled}
      min="0"
      step={step}
      type="number"
      value={value}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
    />
  );
}

interface StackSelectProps {
  ariaLabel?: string;
  value: StackPresetName;
  onChange: (value: StackPresetName) => void;
}

export function StackSelect({ ariaLabel, value, onChange }: StackSelectProps) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) =>
        onChange(event.currentTarget.value as StackPresetName)
      }
    >
      <option value="low">low</option>
      <option value="mid">mid</option>
      <option value="high">high</option>
    </select>
  );
}
