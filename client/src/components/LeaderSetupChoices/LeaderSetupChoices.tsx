import React, { useEffect, useState } from 'react'
import { Leader, FactionType } from '../../types/GameTypes'
import { setSecretFactions } from '../../data/leaderAbilities/baronSecretFaction'

import './LeaderSetupChoices.css'

interface LeaderSetupChoicesProps {
  selectedLeader: Leader
  onComplete: (selectedLeader: Leader) => void
}

const FACTIONS = Object.values(FactionType)

const LeaderSetupChoices: React.FC<LeaderSetupChoicesProps> = ({ selectedLeader, onComplete }) => {
  const [selectedFactions, setSelectedFactions] = useState<FactionType[]>([])

  useEffect(() => {
    if (selectedLeader && !selectedLeader.sogChoice) {
      onComplete(selectedLeader)
    }
  }, [selectedLeader, onComplete])

  if (!selectedLeader?.sogChoice) return null

  const handleFactionClick = (faction: FactionType) => {
    setSelectedFactions(prev => {
      if (prev.includes(faction)) return prev.filter(f => f !== faction)
      if (prev.length < 2) return [...prev, faction]
      return prev
    })
  }

  const handleConfirm = () => {
    if (selectedFactions.length !== 2) return
    onComplete(setSecretFactions(selectedLeader, selectedFactions))
  }

  return (
    <div className="leader-setup-choices">
      <div className="leader-setup-choices-content">
        <div className="faction-choice">
          <h3>Masterstroke – Secret Setup</h3>
          <h4>Secretly choose 2 Factions</h4>
          <p style={{ color: '#5c2d0c', margin: '0 0 0.5rem', fontSize: '0.95em', textAlign: 'center' }}>
            When you deploy 4+ troops to the Conflict in a turn, you will reveal these and gain 1 Influence with each.
          </p>
          <div className="choice-buttons">
            {FACTIONS.map(faction => (
              <button
                key={faction}
                onClick={() => handleFactionClick(faction)}
                className={selectedFactions.includes(faction) ? 'selected' : ''}
                disabled={selectedFactions.length === 2 && !selectedFactions.includes(faction)}
              >
                <img
                  className="faction-icon"
                  src={`/icon/${faction}.png`}
                  alt={faction.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                />
              </button>
            ))}
          </div>
          <p style={{ color: '#5c2d0c', margin: 0, fontSize: '0.9em', textAlign: 'center' }}>
            {selectedFactions.length}/2 selected
          </p>
        </div>
      </div>
      <div className="leader-setup-choices-footer">
        <button
          className="confirm-button"
          onClick={handleConfirm}
          disabled={selectedFactions.length !== 2}
        >
          Confirm Secret Choices
        </button>
      </div>
    </div>
  )
}

export default LeaderSetupChoices
