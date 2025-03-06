import React from 'react'
import { Leader, FactionType} from '../../types/GameTypes'
import { motion } from 'framer-motion'
import { Baron } from '../../data/leaders'
import './LeaderSetupChoices.css'
const FACTIONS = Object.values(FactionType);

interface LeaderSetupChoicesProps {
  leader: Leader
  onComplete: (leader: Leader) => void
}


const LeaderSetupChoices: React.FC<LeaderSetupChoicesProps> = ({ leader, onComplete }) => {


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
      
      {leader instanceof Baron && (
        <div className="faction-choice">
          <h4>Choose 2 Factions for Masterstroke:</h4>
          <div className="choice-buttons">
            {FACTIONS.map((faction: FactionType) => (
              <button
                key={faction}
                onClick={() => handleMasterStroke(faction)}
                className={(leader as Baron).masterStroke.factions?.includes(faction) ? 'selected' : ''}
                disabled={(leader as Baron).masterStroke.factions?.length === 2 && !(leader as Baron).masterStroke.factions?.includes(faction)}
              >
                {faction.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      <button 
        className="confirm-button"
        onClick={() => onComplete(leader)}
        disabled={!(leader as Baron).masterStroke.factions|| (leader as Baron).masterStroke.factions?.length !== 2}
      >
        Confirm Choices
      </button>
    </motion.div>
  )
}

export default LeaderSetupChoices 