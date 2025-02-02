import React, { useState, useEffect } from 'react'
import { useCombat } from '../hooks/useCombat'
import CombatDialog from './CombatDialog'
import CombatArea from './CombatArea'

const CombatPhase: React.FC = () => {
  const { 
    isInCombat,
    currentCombatPlayer,
    hasConsecutivePasses,
    currentConflict,
    combatTroops,
    getCombatStrength,
    resolveCombat
  } = useCombat()

  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    if (isInCombat && currentCombatPlayer && !hasConsecutivePasses) {
      setShowDialog(true)
    }
  }, [isInCombat, currentCombatPlayer, hasConsecutivePasses])

  useEffect(() => {
    if (hasConsecutivePasses) {
      resolveCombat()
    }
  }, [hasConsecutivePasses])

  if (!isInCombat) return null

  const combatStrengths: Record<number, number> = {}
  Object.keys(combatTroops).forEach(playerId => {
    combatStrengths[Number(playerId)] = getCombatStrength(Number(playerId))
  })

  return (
    <div className="combat-phase">
      <CombatArea
        troops={combatTroops}
        combatStrength={combatStrengths}
        currentConflict={currentConflict}
      />
      {showDialog && currentCombatPlayer && (
        <CombatDialog
          playerId={currentCombatPlayer.id}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  )
}

export default CombatPhase 