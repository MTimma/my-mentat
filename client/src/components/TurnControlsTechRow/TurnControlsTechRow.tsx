import React, { useMemo } from 'react'
import type { TechTileId } from '../../data/techTiles'
import type { GameState, Player } from '../../types/GameTypes'
import { tilesActivatableNow } from '../../utils/techTiles'
import PlayerTechTiles from '../PlayerTechTiles/PlayerTechTiles'
import './TurnControlsTechRow.css'

export interface TurnControlsTechRowProps {
  gameState: GameState
  player: Player
  onActivateTech?: (playerId: number, tileId: TechTileId) => void
  isHistoryView?: boolean
}

/** Acquired tech tiles for the active player in the play-area footer. */
const TurnControlsTechRow: React.FC<TurnControlsTechRowProps> = ({
  gameState,
  player,
  onActivateTech,
  isHistoryView,
}) => {
  const ownedTiles = player.tech ?? []
  if (ownedTiles.length === 0) return null

  const activatableTiles = useMemo(() => {
    if (isHistoryView || !onActivateTech) return []
    return tilesActivatableNow(gameState, player.id)
  }, [gameState, isHistoryView, onActivateTech, player.id])

  const activatableIds = useMemo(
    () => new Set(activatableTiles.map(tile => tile.id)),
    [activatableTiles]
  )

  return (
    <div className="turn-controls-tech-row" aria-label="Acquired technology">
      <PlayerTechTiles
        tiles={ownedTiles}
        variant="inline"
        activatableTileIds={activatableIds}
        onTileClick={
          onActivateTech
            ? tileId => {
                if (activatableIds.has(tileId)) onActivateTech(player.id, tileId)
              }
            : undefined
        }
        ariaLabel={`${player.leader.name} acquired technology`}
      />
    </div>
  )
}

export default TurnControlsTechRow
