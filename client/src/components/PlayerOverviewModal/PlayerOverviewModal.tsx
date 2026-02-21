import { ControlMarkerType, FactionType, Player } from '../../types/GameTypes'
import './PlayerOverviewModal.css'

interface PlayerOverviewModalProps {
  players: Player[]
  factionInfluence: Record<FactionType, Record<number, number>>
  factionAlliances: Record<FactionType, number | null>
  controlMarkers: Record<ControlMarkerType, number | null>
  combatTroops: Record<number, number>
  combatStrength: Record<number, number>
  combatPasses: Set<number>
  activePlayerId: number
  firstPlayerMarker: number
  mentatOwner: number | null
  isCombatPhase: boolean
  onClose: () => void
}

type NumericRow = {
  key: string
  label: string
  icon?: string
  value: (player: Player) => number
  highlightBest?: boolean
}

const factions: Array<{ type: FactionType; label: string; icon: string }> = [
  { type: FactionType.EMPEROR, label: 'Emperor', icon: 'emperor' },
  { type: FactionType.SPACING_GUILD, label: 'Guild', icon: 'spacing-guild' },
  { type: FactionType.BENE_GESSERIT, label: 'Bene G.', icon: 'bene-gesserit' },
  { type: FactionType.FREMEN, label: 'Fremen', icon: 'fremen' }
]

const controlRows: Array<{ type: ControlMarkerType; label: string }> = [
  { type: ControlMarkerType.ARRAKIN, label: 'Arrakeen' },
  { type: ControlMarkerType.CARTHAG, label: 'Carthag' },
  { type: ControlMarkerType.IMPERIAL_BASIN, label: 'Imp. Basin' }
]

const getTotalAgents = (player: Player): number => (player.hasSwordmaster ? 3 : 2)

const PlayerOverviewModal = ({
  players,
  factionInfluence,
  factionAlliances,
  controlMarkers,
  combatTroops,
  combatStrength,
  combatPasses,
  activePlayerId,
  firstPlayerMarker,
  mentatOwner,
  isCombatPhase,
  onClose
}: PlayerOverviewModalProps) => {
  const getBestValue = (valueSelector: (player: Player) => number): number => {
    return Math.max(...players.map(valueSelector), 0)
  }

  const baseRows: NumericRow[] = [
    { key: 'vp', label: 'VP', icon: 'vp', value: player => player.victoryPoints, highlightBest: true },
    { key: 'spice', label: 'Spice', icon: 'spice', value: player => player.spice, highlightBest: true },
    { key: 'water', label: 'Water', icon: 'water', value: player => player.water, highlightBest: true },
    { key: 'solari', label: 'Solari', icon: 'solari', value: player => player.solari, highlightBest: true },
    { key: 'garrison', label: 'Garrison', value: player => player.troops, highlightBest: true },
    { key: 'deployed', label: 'Deployed', value: player => combatTroops[player.id] || 0, highlightBest: true },
    { key: 'strength', label: 'Strength', value: player => combatStrength[player.id] || 0, highlightBest: true },
    { key: 'hand', label: 'Hand', value: player => player.handCount, highlightBest: true },
    { key: 'deck', label: 'Deck', value: player => player.deck.length, highlightBest: true },
    { key: 'discard', label: 'Discard', value: player => player.discardPile.length, highlightBest: true },
    { key: 'intrigue', label: 'Intrigue', value: player => player.intrigueCount, highlightBest: true }
  ]

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="player-overview-modal" onClick={event => event.stopPropagation()}>
        <div className="player-overview-header">
          <h3>Player Overview</h3>
          <button className="player-overview-close player-overview-close-top" onClick={onClose} aria-label="Close player overview">
            x
          </button>
        </div>

        <div className="player-overview-table-wrap">
          <table className="player-overview-table">
            <thead>
              <tr>
                <th className="stat-col" />
                {players.map(player => (
                  <th key={player.id} className={`player-col player-${player.color}`}>
                    <div className="player-name">{player.leader.name}</div>
                    <div className="player-badges">
                      {player.id === activePlayerId && <span className="player-badge">active</span>}
                      {player.id === firstPlayerMarker && <span className="player-badge">1st</span>}
                      {player.hasSwordmaster && <span className="player-badge">SM</span>}
                      {player.hasHighCouncilSeat && <span className="player-badge">HC</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {baseRows.slice(0, 4).map(row => {
                const best = row.highlightBest ? getBestValue(row.value) : 0
                return (
                  <tr key={row.key}>
                    <td className="stat-label">
                      {row.icon && <img src={`/icon/${row.icon}.png`} alt="" aria-hidden="true" className="stat-icon" />}
                      <span>{row.label}</span>
                    </td>
                    {players.map(player => {
                      const value = row.value(player)
                      const isBest = row.highlightBest && best > 0 && value === best
                      return (
                        <td key={player.id} className={isBest ? 'best-value' : ''}>
                          {value}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              <tr>
                <td className="stat-label">
                  <span>Agents</span>
                </td>
                {players.map(player => (
                  <td key={player.id}>
                    {player.agents}/{getTotalAgents(player)}
                    {mentatOwner === player.id && <span className="inline-badge">M</span>}
                  </td>
                ))}
              </tr>

              {factions.map(({ type, label, icon }) => {
                const best = Math.max(...players.map(player => factionInfluence[type]?.[player.id] || 0), 0)
                return (
                  <tr key={type}>
                    <td className="stat-label">
                      <img src={`/icon/${icon}.png`} alt="" aria-hidden="true" className="stat-icon" />
                      <span>{label}</span>
                    </td>
                    {players.map(player => {
                      const influence = factionInfluence[type]?.[player.id] || 0
                      const isBest = best > 0 && influence === best
                      return (
                        <td key={player.id} className={isBest ? 'best-value' : ''}>
                          {influence}
                          {factionAlliances[type] === player.id && <span className="inline-badge">*</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {baseRows.slice(4).map(row => {
                const best = row.highlightBest ? getBestValue(row.value) : 0
                const isCombatRow = row.key === 'garrison' || row.key === 'deployed' || row.key === 'strength'
                return (
                  <tr key={row.key} className={isCombatRow ? 'row-combat' : undefined}>
                    <td className="stat-label">
                      {row.icon && <img src={`/icon/${row.icon}.png`} alt="" aria-hidden="true" className="stat-icon" />}
                      <span>{row.label}</span>
                    </td>
                    {players.map(player => {
                      const value = row.value(player)
                      const isBest = row.highlightBest && best > 0 && value === best
                      return (
                        <td key={player.id} className={isBest ? 'best-value' : ''}>
                          {value}
                          {row.key === 'strength' && isCombatPhase && combatPasses.has(player.id) && (
                            <span className="inline-badge">P</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {controlRows.map(({ type, label }) => (
                <tr key={type}>
                  <td className="stat-label">{label}</td>
                  {players.map(player => (
                    <td key={player.id}>{controlMarkers[type] === player.id ? 'X' : ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="player-overview-footer">
          <button className="player-overview-close player-overview-close-bottom" onClick={onClose} aria-label="Close player overview">
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlayerOverviewModal
