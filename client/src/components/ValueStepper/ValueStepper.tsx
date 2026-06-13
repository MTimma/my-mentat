import React from 'react'
import './ValueStepper.css'

export interface ValueStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  icon?: React.ReactNode
  compact?: boolean
  cluster?: boolean
  className?: string
  decreaseLabel?: string
  increaseLabel?: string
}

const ValueStepper: React.FC<ValueStepperProps> = ({
  value,
  onChange,
  min = 0,
  max,
  label,
  icon,
  compact = false,
  cluster = false,
  className,
  decreaseLabel = 'Decrease value',
  increaseLabel = 'Increase value',
}) => {
  const atMin = value <= min
  const atMax = max != null && value >= max

  const stopPointer = (event: React.PointerEvent) => {
    event.stopPropagation()
  }

  return (
    <div
      className={[
        'value-stepper',
        compact ? 'value-stepper--compact' : '',
        cluster ? 'value-stepper--cluster' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(label || icon) && (
        <div className="value-stepper__heading">
          {icon ? <span className="value-stepper__icon-wrap">{icon}</span> : null}
          {label ? <span className="value-stepper__label">{label}</span> : null}
        </div>
      )}
      <div className="value-stepper__controls" onPointerDown={stopPointer}>
        <button
          type="button"
          className="value-stepper__btn value-stepper__btn--decrease"
          aria-label={decreaseLabel}
          disabled={atMin}
          onPointerDown={stopPointer}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <span aria-hidden="true">−</span>
        </button>
        <span className="value-stepper__value" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="value-stepper__btn value-stepper__btn--increase"
          aria-label={increaseLabel}
          disabled={atMax}
          onPointerDown={stopPointer}
          onClick={() => onChange(max != null ? Math.min(max, value + 1) : value + 1)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  )
}

export default ValueStepper
