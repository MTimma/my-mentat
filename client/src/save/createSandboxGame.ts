import type { Player } from '../types/GameTypes'
import { buildImperiumDeck } from '../catalog/runtime'
import { createUnassignedLeader } from '../data/leaders'
import { getStartingSpice, getStartingSolari } from '../data/leaderAbilities/beastSetup'
import { getStartingIntrigue } from '../data/leaderAbilities/hudroSetup'
import { getStartingWater } from '../data/leaderAbilities/yunaSolariBonus'
import { seedTessiaSnoopers } from '../data/leaderAbilities/tessiaSnoopers'
import { expansionsForGamePack } from '../gamePacks/resolveGamePack'
import { applyStarterDeckReservationToImperium, buildStartingDeck } from '../services/starterDeckSetup'
import { DEFAULT_PLAYER_COLORS } from '../utils/playerColors'
import { buildSetupBlockFromConfiguration } from './buildSetupBlock'
import { createGameInputDoc } from './createGameInput'
import type { SaveDoc } from './types'

const DEFAULT_SANDBOX_PLAYER_COUNT = 4

export interface CreateSandboxGameOptions {
  title?: string
  playerCount?: number
  id?: string
}

export function createSandboxGameInput(
  gamePackId: string,
  options: CreateSandboxGameOptions = {}
): SaveDoc {
  const playerCount = options.playerCount ?? DEFAULT_SANDBOX_PLAYER_COUNT
  const setupExpansions = expansionsForGamePack(gamePackId)
  const decks = Array.from({ length: playerCount }, () => buildStartingDeck(gamePackId))
  const imperiumDeck = applyStarterDeckReservationToImperium(
    buildImperiumDeck(setupExpansions),
    decks
  )
  const players: Player[] = decks.map((deck, index) => {
    const leader = createUnassignedLeader()
    return seedTessiaSnoopers(
      {
        id: index,
        leader,
        color: DEFAULT_PLAYER_COLORS[index],
        spice: getStartingSpice(leader),
        water: getStartingWater(leader),
        solari: getStartingSolari(leader),
        troops: 3,
        combatValue: 0,
        agents: 2,
        handCount: 5,
        intrigueCount: getStartingIntrigue(leader),
        deck: [...deck],
        discardPile: [],
        trash: [],
        hasHighCouncilSeat: false,
        hasSwordmaster: false,
        playArea: [],
        persuasion: 0,
        victoryPoints: 1,
        revealed: false,
        ...(setupExpansions.riseOfIx ? { freighterStep: 0 as const } : {}),
      },
      setupExpansions.riseOfIx
    )
  })
  const { setup, unmapped } = buildSetupBlockFromConfiguration({
    players,
    firstPlayer: 0,
    imperiumRowDeck: imperiumDeck,
    sandbox: true,
    gamePackId,
  })
  return createGameInputDoc(setup, {
    id: options.id,
    title: options.title?.trim() || 'Sandbox game',
    notes: unmapped.length ? `Unmapped catalog entries: ${unmapped.join(', ')}` : undefined,
  })
}
