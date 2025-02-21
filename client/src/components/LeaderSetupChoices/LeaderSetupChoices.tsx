import React, { useState } from 'react'
import { Leader, FactionType, StartOfGameChoice } from '../../types/GameTypes'
import { motion } from 'framer-motion'
import './LeaderSetupChoices.css'
const FACTIONS = Object.values(FactionType);

interface LeaderSetupChoicesProps {
  leader: Leader
  onComplete: (choice: StartOfGameChoice) => void
}


const LeaderSetupChoices: React.FC<LeaderSetupChoicesProps> = ({ leader, onComplete }) => {
  const [choices, setChoice] = useState<StartOfGameChoice>({
    masterStrokeFactions: []
  })

  const handleMasterStroke = (faction: FactionType) => {
    setChoice(prev => {
      const currentFactions = prev.masterStrokeFactions || []
      
      if (currentFactions.includes(faction)) {
        return {
          masterStrokeFactions: currentFactions.filter(f => f !== faction)
        }
      } else if (currentFactions.length < 2) {
        return {
          masterStrokeFactions: [...currentFactions, faction]
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
      
      {leader.name === "BARON VLADIMIR HARKONNEN" && (
        <div className="faction-choice">
          <h4>Choose 2 Factions for Masterstroke:</h4>
          <div className="choice-buttons">
            {FACTIONS.map((faction: FactionType) => (
              <button
                key={faction}
                onClick={() => handleMasterStroke(faction)}
                className={choices.masterStrokeFactions?.includes(faction) ? 'selected' : ''}
                disabled={choices.masterStrokeFactions?.length === 2 && !choices.masterStrokeFactions?.includes(faction)}
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
        disabled={!choices.masterStrokeFactions || choices.masterStrokeFactions.length !== 2}
      >
        Confirm Choices
      </button>
    </motion.div>
  )
}

export default LeaderSetupChoices 