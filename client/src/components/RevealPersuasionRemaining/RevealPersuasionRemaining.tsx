import './RevealPersuasionRemaining.css'

interface RevealPersuasionRemainingProps {
  amount: number
  className?: string
}

const RevealPersuasionRemaining = ({ amount, className }: RevealPersuasionRemainingProps) => (
  <div
    className={['reveal-persuasion-remaining-chip', className].filter(Boolean).join(' ')}
    title={`${amount} persuasion remaining to spend`}
    aria-label={`${amount} persuasion remaining`}
  >
    <span className="reveal-persuasion-remaining-chip__icon" aria-hidden="true">
      <span className="reveal-persuasion-remaining-chip__diamond" />
      <span className="reveal-persuasion-remaining-chip__count">{amount}</span>
    </span>
    <span className="reveal-persuasion-remaining-chip__label">left</span>
  </div>
)

export default RevealPersuasionRemaining
