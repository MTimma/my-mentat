import React, { useState } from 'react'
import { Leader, FactionType } from '../types/GameTypes'
import { motion } from 'framer-motion'

interface LeaderSetupChoicesProps {
  leader: Leader
  onComplete: (choices: LeaderChoices) => void
}

interface LeaderChoices {
  startingResources?: {
    spice?: number
    water?: number
    solari?: number
  }
  startingInfluence?: {
    faction: FactionType
    amount: number
  }
  specialAbilityChoice?: string
}

const LeaderSetupChoices: React.FC<LeaderSetupChoicesProps> = ({ leader, onComplete }) => {
  const [choices, setChoices] = useState<LeaderChoices>({})

  const handleResourceChoice = (resource: 'spice' | 'water' | 'solari', amount: number) => {
    setChoices(prev => ({
      ...prev,
      startingResources: {
        ...prev.startingResources,
        [resource]: amount
      }
    }))
  }

  const handleInfluenceChoice = (faction: FactionType) => {
    setChoices(prev => ({
      ...prev,
      startingInfluence: {
        faction,
        amount: 1
      }
    }))
  }

  return (
    <motion.div 
      className="leader-setup-choices"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3>{leader.name}'s Setup Choices</h3>
      
      {/* Resource choices if applicable */}
      {leader.name === "Count Ilban Richese" && (
        <div className="resource-choice">
          <h4>Choose your starting bonus:</h4>
          <div className="choice-buttons">
            <button onClick={() => handleResourceChoice('solari', 2)}>
              2 Solari
            </button>
            <button onClick={() => handleResourceChoice('water', 1)}>
              1 Water
            </button>
          </div>
        </div>
      )}

      {/* Influence choices if applicable */}
      {leader.name === "Countess Ariana Thorvald" && (
        <div className="influence-choice">
          <h4>Choose a faction to start with 1 influence:</h4>
          <div className="faction-buttons">
            {Object.values(FactionType).map(faction => (
              <button 
                key={faction}
                onClick={() => handleInfluenceChoice(faction)}
                className={`faction-button ${faction.toLowerCase()}`}
              >
                {faction}
              </button>
            ))}
          </div>
        </div>
      )}

      <button 
        className="confirm-button"
        onClick={() => onComplete(choices)}
        disabled={!Object.keys(choices).length}
      >
        Confirm Choices
      </button>
    </motion.div>
  )
}

export default LeaderSetupChoices 