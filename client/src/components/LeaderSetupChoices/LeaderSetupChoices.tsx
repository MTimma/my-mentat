import React from 'react'
import { Leader } from '../../types/GameTypes'
import { Baron } from '../../data/leaders'
import BaronSetupChoice from './BaronSetupChoice'

import './LeaderSetupChoices.css'

interface LeaderSetupChoicesProps {
  selectedLeader: Leader
  onComplete: (selectedLeader: Leader) => void
}

const LeaderSetupChoices: React.FC<LeaderSetupChoicesProps> = ({ selectedLeader, onComplete }) => {

  if (!selectedLeader) {
    return <></>;
  }

  return (
    <>
    {selectedLeader instanceof Baron && <BaronSetupChoice initBaron={selectedLeader} onComplete={onComplete} />}
    </>
  )
}

export default LeaderSetupChoices 