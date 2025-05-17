import { Baron } from "../../data/leaders"
import { motion } from 'framer-motion'
import { FactionType, Leader } from "../../types/GameTypes"
import { useState } from "react"


interface BaronSetupChoiceProps {
    initBaron: Baron
    onComplete: (leader: Leader) => void
}
const FACTIONS = Object.values(FactionType);

const BaronSetupChoice: React.FC<BaronSetupChoiceProps> = ({ initBaron, onComplete }) => {
    const [baron, setBaron] = useState<Baron>(initBaron)

    const handleMasterStroke= (faction: FactionType) => {
      setBaron((prev: Baron) => {
        let f = prev.masterStroke.factions || []
        if (f.includes(faction)) {
          f = f.filter(f => f !== faction)
        } else if (f.length < 2) {
          f = [...f, faction]
        }
        return {...prev, masterStroke: {triggered: false, factions: f}} as Baron
      });
    }
  

  return (    
  <motion.div 
    className="leader-setup-choices"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <h3>{baron.name}'s Setup Choices</h3>
    
    <div className="faction-choice">
        <h4>Choose 2 Factions for Masterstroke:</h4>
        <div className="choice-buttons">
            {FACTIONS.map((faction: FactionType) => (
            <button
                key={faction}
                onClick={() => handleMasterStroke(faction)}
                className={`faction-icon ${baron.masterStroke.factions?.includes(faction) ? 'selected' : ''}`}
                disabled={baron.masterStroke.factions?.length === 2 && !baron.masterStroke.factions?.includes(faction)}
            >
              <img className="faction-icon" src={`/icon/${faction}.png`} alt={faction.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} />
            </button>
            ))}
        </div>
    </div>

    <button 
      className="confirm-button"
      onClick={() => onComplete(baron)}
      disabled={!baron.masterStroke.factions|| baron.masterStroke.factions?.length !== 2}
    >
      Confirm Choices
    </button>
  </motion.div>)
}

export default BaronSetupChoice