import { LEADER_ICON_SLUGS } from '../data/leaders'
import { inferGamePackId } from '../gamePacks/inferGamePack'
import { compareEndgameStanding } from '../utils/endgameResolution'
import { getTotalVictoryPoints } from '../utils/influenceVictoryPoints'
import { displayPlayerName, listedPlayerName } from '../utils/playerName'
import { replaySaveDoc } from './replay'
import type { SaveDoc, SaveSummary } from './types'

function leaderNameFromId(leaderId: string): string {
  return Object.entries(LEADER_ICON_SLUGS).find(([, slug]) => slug === leaderId)?.[0] ?? leaderId
}

/** List-view summary (standings, names, VP) from a save document. */
export function summarizeSaveForList(doc: SaveDoc): SaveSummary | undefined {
  const setup = doc.setup
  if (!setup?.players?.length) return undefined
  const turns = (doc.events ?? []).filter(entry => entry.a?.type === 'END_TURN').length
  try {
    const { state } = replaySaveDoc(doc)
    const players = [...setup.players]
      .sort((a, b) => {
        const playerA = state.players.find(p => p.id === a.id)
        const playerB = state.players.find(p => p.id === b.id)
        if (!playerA || !playerB) return 0
        return compareEndgameStanding(state, playerA, playerB)
      })
      .map(setupPlayer => {
        const player = state.players.find(p => p.id === setupPlayer.id)
        const leaderId = player
          ? (LEADER_ICON_SLUGS[player.leader.name] ?? setupPlayer.leaderId)
          : setupPlayer.leaderId
        return {
          id: setupPlayer.id,
          name: player
            ? listedPlayerName(player)
            : displayPlayerName(setupPlayer.name?.trim() || leaderNameFromId(leaderId)),
          leaderId,
          color: player?.color ?? setupPlayer.color,
          vp: player ? getTotalVictoryPoints(player, state) : 0,
        }
      })
    return {
      gamePackId: inferGamePackId(setup),
      rounds: state.currentRound,
      turns,
      players,
    }
  } catch {
    return {
      gamePackId: inferGamePackId(setup),
      rounds: setup.currentRound ?? 1,
      turns,
      players: setup.players.map(player => ({
        id: player.id,
        name: displayPlayerName(player.name?.trim() || leaderNameFromId(player.leaderId)),
        leaderId: player.leaderId,
        color: player.color,
        vp: player.startingResources?.victoryPoints ?? 0,
      })),
    }
  }
}

export function summaryNeedsPlayerList(summary?: SaveSummary): boolean {
  return !summary?.players?.length
}
