import React, { useState } from 'react'
import { Leader, FactionType } from '../types/GameTypes'
import { motion } from 'framer-motion'
import '../css/LeaderSetupChoices.css'

const FACTIONS = Object.values(FactionType);

interface LeaderSetupChoicesProps {
  leader: Leader
  onComplete: (choices: LeaderChoices) => void
}

interface LeaderChoices {
  specialAbilityChoice?: string
  selectedFactions?: FactionType[]
}


const LeaderSetupChoices: React.FC<LeaderSetupChoicesProps> = ({ leader, onComplete }) => {
  const [choices, setChoices] = useState<LeaderChoices>({
    selectedFactions: []
  })

  const handleFactionChoice = (faction: FactionType) => {
    setChoices(prev => {
      const currentFactions = prev.selectedFactions || []
      
      if (currentFactions.includes(faction)) {
        return {
          ...prev,
          selectedFactions: currentFactions.filter(f => f !== faction)
        }
      } else if (currentFactions.length < 2) {
        return {
          ...prev,
          selectedFactions: [...currentFactions, faction]
        }
      }
      return prev
    })
  }

  return (
    <motion.div 
      className="leader-setup-choices"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3>{leader.name}'s Setup Choices</h3>
      
      {/* Resource choices if applicable */}
      {leader.name === "BARON VLADIMIR HARKONNEN" && (
        <div className="faction-choice">
          <h4>Choose 2 Factions for Masterstroke:</h4>
          <div className="choice-buttons">
            {FACTIONS.map((faction: FactionType) => (
              <button
                key={faction}
                onClick={() => handleFactionChoice(faction)}
                className={choices.selectedFactions?.includes(faction) ? 'selected' : ''}
                disabled={choices.selectedFactions?.length === 2 && !choices.selectedFactions?.includes(faction)}
              >
                {faction.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      <button 
        className="confirm-button"
        onClick={() => onComplete(choices)}
        disabled={!choices.selectedFactions || choices.selectedFactions.length !== 2}
      >
        Confirm Choices
      </button>
    </motion.div>
  )
}

export default LeaderSetupChoices 