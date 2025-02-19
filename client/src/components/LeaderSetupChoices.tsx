import React, { useState } from 'react'
import { Leader, FactionType } from '../types/GameTypes'
import { motion } from 'framer-motion'
import { LEADERS } from './data/leaders'

interface LeaderSetupChoicesProps {
  leader: Leader
  onComplete: (choices: LeaderChoices) => void
}

interface LeaderChoices {

  specialAbilityChoice?: string
}

const LeaderSetupChoices: React.FC<LeaderSetupChoicesProps> = ({ leader, onComplete }) => {
  const [choices, setChoices] = useState<LeaderChoices>({})
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
      {leader.name === "BARON VLADIMIR HARKONNEN" && (
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