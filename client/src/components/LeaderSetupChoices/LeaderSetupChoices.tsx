import React, { useEffect } from 'react'
import { Leader } from '../../types/GameTypes'

import './LeaderSetupChoices.css'

interface LeaderSetupChoicesProps {
  selectedLeader: Leader
  onComplete: (selectedLeader: Leader) => void
}

const LeaderSetupChoices: React.FC<LeaderSetupChoicesProps> = ({ selectedLeader, onComplete }) => {
  useEffect(() => {
    if (selectedLeader) {
      onComplete(selectedLeader)
    }
  }, [selectedLeader, onComplete])

  // Baron no longer has setup choices - factions are chosen when Masterstroke is triggered.
  // Proceed directly with selected leader.
  return null
}

export default LeaderSetupChoices 