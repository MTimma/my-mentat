import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { hasSeenWelcome, markWelcomeSeen } from './welcomeSeen'
import './WelcomeModal.css'

const WelcomeModal = () => {
  const [open, setOpen] = useState(() => !hasSeenWelcome())

  const dismiss = useCallback(() => {
    markWelcomeSeen()
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, dismiss])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="welcome-modal" onClick={dismiss}>
      <div
        className="welcome-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="welcome-modal__heading">
          <img
            className="welcome-modal__worm"
            src="/icon/first_player.png"
            alt=""
            width={158}
            height={142}
          />
          <h2 id="welcome-modal-title" className="welcome-modal__title">
            Welcome!
          </h2>
        </div>
        <div className="welcome-modal__body">
          <p>
            Mentarium is an analysis board for the board game <em>Dune Imperium</em>.
          </p>
          <p>
            Finish the setup to start logging your game, or click 'Browse' to see the published boards by other
            players. There you can also access your unpublished drafts (up to 5 per browser).
          </p>
          <p>Try out the Advanced setup to create the perfect play without the initial rounds!</p>
        </div>
        <blockquote className="welcome-modal__quote">
          <p>
            “Without mentat overlay integration, you can be immersed in the Babel Problem, which
            is the label we give to the omnipresent dangers of achieving wrong combinations from
            accurate information.”
          </p>
          <footer>- The Mentat Handbook</footer>
        </blockquote>
        <button
          type="button"
          className="welcome-modal__continue"
          onClick={dismiss}
        >
          Let's start!
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default WelcomeModal
