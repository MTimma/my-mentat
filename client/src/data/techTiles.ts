import type { CustomEffect, Reward } from '../types/GameTypes'
import { CustomEffect as CE, FactionType } from '../types/GameTypes'

export enum TechTileId {
  ARTILLERY = 'artillery',
  CHAUMURKY = 'chaumurky',
  DETONATION_DEVICES = 'detonation_devices',
  DISPOSAL_FACILITY = 'disposal_facility',
  FLAGSHIP = 'flagship',
  HOLOPROJECTORS = 'holoprojectors',
  HOLTZMAN_ENGINE = 'holtzman_engine',
  INVASION_SHIPS = 'invasion_ships',
  MEMOCORDERS = 'memocorders',
  MINIMIC_FILM = 'minimic_film',
  RESTRICTED_ORDINANCE = 'restricted_ordinance',
  SHUTTLE_FLEET = 'shuttle_fleet',
  SONIC_SNOOPERS = 'sonic_snoopers',
  SPACEPORT = 'spaceport',
  SPY_SATELLITES = 'spy_satellites',
  TRAINING_DRONES = 'training_drones',
  TROOP_TRANSPORTS = 'troop_transports',
  WINDTRAPS = 'windtraps',
}

export enum TechTileTiming {
  REVEAL = 'reveal',
  ROUND_START = 'round-start',
  AGENT = 'agent',
  AGENT_REVEAL_ONCE_PER_ROUND = 'agent-reveal-once-per-round',
  AGENT_REVEAL_ALWAYS = 'agent-reveal-always',
  AGENT_REVEAL_ONE_TIME = 'agent-reveal-one-time',
  ENDGAME = 'endgame',
  AFTER_CONFLICT = 'after-conflict',
}

export interface PlayerTechTile {
  id: TechTileId
  faceUp: boolean
}

export interface TechTile {
  id: TechTileId
  name: string
  cost: number
  image: string
  timing: TechTileTiming[]
  acquireEffect?: Reward
  description: string
  customEffect?: CustomEffect
}

function techTileImage(id: TechTileId): string {
  return `/technologies/rise_of_ix/${id}.png`
}

const ALL_FOUR_INFLUENCE = {
  chooseOne: true,
  amounts: [
    { faction: FactionType.EMPEROR, amount: 1 },
    { faction: FactionType.SPACING_GUILD, amount: 1 },
    { faction: FactionType.BENE_GESSERIT, amount: 1 },
    { faction: FactionType.FREMEN, amount: 1 },
  ],
}

/** Canonical Rise of Ix tech tile definitions (18 tiles). */
export const TECH_TILES: TechTile[] = [
  {
    id: TechTileId.ARTILLERY,
    name: 'Artillery',
    cost: 1,
    image: techTileImage(TechTileId.ARTILLERY),
    timing: [TechTileTiming.REVEAL],
    description: 'Reveal: +1 sword for each revealed card that provides ≥1 sword this turn.',
    customEffect: CE.ARTILLERY,
  },
  {
    id: TechTileId.CHAUMURKY,
    name: 'Chaumurky',
    cost: 4,
    image: techTileImage(TechTileId.CHAUMURKY),
    timing: [TechTileTiming.ENDGAME],
    acquireEffect: { intrigueCards: 2 },
    description: 'Endgame: win tiebreakers.',
    customEffect: CE.CHAUMURKY,
  },
  {
    id: TechTileId.DETONATION_DEVICES,
    name: 'Detonation Devices',
    cost: 3,
    image: techTileImage(TechTileId.DETONATION_DEVICES),
    timing: [TechTileTiming.AFTER_CONFLICT],
    description: 'When you win a Conflict with a dreadnought in it: +1 VP and return dreadnought to supply, or take control normally.',
    customEffect: CE.DETONATION_DEVICES,
  },
  {
    id: TechTileId.DISPOSAL_FACILITY,
    name: 'Disposal Facility',
    cost: 3,
    image: techTileImage(TechTileId.DISPOSAL_FACILITY),
    timing: [TechTileTiming.REVEAL],
    acquireEffect: { trash: 1 },
    description: 'Reveal: if persuasion ≥ 6, you may trash one card in play.',
    customEffect: CE.DISPOSAL_FACILITY,
  },
  {
    id: TechTileId.FLAGSHIP,
    name: 'Flagship',
    cost: 8,
    image: techTileImage(TechTileId.FLAGSHIP),
    timing: [TechTileTiming.AGENT_REVEAL_ONCE_PER_ROUND],
    acquireEffect: { victoryPoints: 1 },
    description: 'Pay 4 Solari → recruit 3 troops (once per round).',
    customEffect: CE.FLAGSHIP,
  },
  {
    id: TechTileId.HOLOPROJECTORS,
    name: 'Holoprojectors',
    cost: 3,
    image: techTileImage(TechTileId.HOLOPROJECTORS),
    timing: [TechTileTiming.AGENT_REVEAL_ONCE_PER_ROUND],
    description: 'Discard 1 card → draw 1 card (once per round).',
    customEffect: CE.HOLOPROJECTORS,
  },
  {
    id: TechTileId.HOLTZMAN_ENGINE,
    name: 'Holtzman Engine',
    cost: 6,
    image: techTileImage(TechTileId.HOLTZMAN_ENGINE),
    timing: [TechTileTiming.ROUND_START, TechTileTiming.ENDGAME],
    description: 'Round Start: draw 1 card. Endgame: +1 VP if you have ≥2 Spice Must Flow.',
    customEffect: CE.HOLTZMAN_ENGINE,
  },
  {
    id: TechTileId.INVASION_SHIPS,
    name: 'Invasion Ships',
    cost: 5,
    image: techTileImage(TechTileId.INVASION_SHIPS),
    timing: [TechTileTiming.AGENT],
    acquireEffect: { troops: 4 },
    description: 'Agent (once per round): discard 1 → enemy agents do not block your agent this turn.',
    customEffect: CE.INVASION_SHIPS,
  },
  {
    id: TechTileId.MEMOCORDERS,
    name: 'Memocorders',
    cost: 2,
    image: techTileImage(TechTileId.MEMOCORDERS),
    timing: [TechTileTiming.ENDGAME],
    acquireEffect: { influence: ALL_FOUR_INFLUENCE },
    description: 'Endgame: +1 VP if you have ≥3 influence on all four tracks.',
    customEffect: CE.MEMOCORDERS,
  },
  {
    id: TechTileId.MINIMIC_FILM,
    name: 'Minimic Film',
    cost: 2,
    image: techTileImage(TechTileId.MINIMIC_FILM),
    timing: [TechTileTiming.REVEAL],
    description: 'Reveal: +1 persuasion.',
  },
  {
    id: TechTileId.RESTRICTED_ORDINANCE,
    name: 'Restricted Ordinance',
    cost: 4,
    image: techTileImage(TechTileId.RESTRICTED_ORDINANCE),
    timing: [TechTileTiming.REVEAL],
    description: 'Reveal: +4 swords if you have a High Council seat.',
    customEffect: CE.RESTRICTED_ORDINANCE,
  },
  {
    id: TechTileId.SHUTTLE_FLEET,
    name: 'Shuttle Fleet',
    cost: 6,
    image: techTileImage(TechTileId.SHUTTLE_FLEET),
    timing: [TechTileTiming.ROUND_START],
    acquireEffect: { influence: ALL_FOUR_INFLUENCE },
    description: 'Round Start: +2 solari.',
  },
  {
    id: TechTileId.SONIC_SNOOPERS,
    name: 'Sonic Snoopers',
    cost: 2,
    image: techTileImage(TechTileId.SONIC_SNOOPERS),
    timing: [TechTileTiming.AGENT_REVEAL_ONE_TIME],
    acquireEffect: { intrigueCards: 1 },
    description: 'Trash this → put intrigue on bottom of deck, draw that many.',
    customEffect: CE.SONIC_SNOOPERS,
  },
  {
    id: TechTileId.SPACEPORT,
    name: 'Spaceport',
    cost: 5,
    image: techTileImage(TechTileId.SPACEPORT),
    timing: [TechTileTiming.AGENT_REVEAL_ALWAYS],
    acquireEffect: { drawCards: 2 },
    description: 'Passive: you may put cards you acquire on top of your deck.',
    customEffect: CE.SPACEPORT,
  },
  {
    id: TechTileId.SPY_SATELLITES,
    name: 'Spy Satellites',
    cost: 4,
    image: techTileImage(TechTileId.SPY_SATELLITES),
    timing: [TechTileTiming.AGENT_REVEAL_ONE_TIME, TechTileTiming.ENDGAME],
    description: 'Pay 3 spice, trash this → +1 VP. Endgame: +1 VP per faction where you have ≤1 influence.',
    customEffect: CE.SPY_SATELLITES,
  },
  {
    id: TechTileId.TRAINING_DRONES,
    name: 'Training Drones',
    cost: 3,
    image: techTileImage(TechTileId.TRAINING_DRONES),
    timing: [TechTileTiming.AGENT_REVEAL_ONCE_PER_ROUND],
    description: 'Recruit 1 troop (once per round).',
    customEffect: CE.TRAINING_DRONES,
  },
  {
    id: TechTileId.TROOP_TRANSPORTS,
    name: 'Troop Transports',
    cost: 2,
    image: techTileImage(TechTileId.TROOP_TRANSPORTS),
    timing: [TechTileTiming.AGENT_REVEAL_ALWAYS],
    description: 'When recruiting from Shipping track, recruit +1 troop (may deploy to Conflict).',
    customEffect: CE.TROOP_TRANSPORTS,
  },
  {
    id: TechTileId.WINDTRAPS,
    name: 'Windtraps',
    cost: 2,
    image: techTileImage(TechTileId.WINDTRAPS),
    timing: [TechTileTiming.AFTER_CONFLICT],
    acquireEffect: { water: 1 },
    description: 'When you win a Conflict: +1 water.',
    customEffect: CE.WINDTRAPS,
  },
]

export function getTechTile(id: TechTileId): TechTile | undefined {
  return TECH_TILES.find(tile => tile.id === id)
}

export function getTechTileByName(name: string): TechTile | undefined {
  return TECH_TILES.find(tile => tile.name === name)
}
