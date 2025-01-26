export interface Leader {
  name: string
  ability: {
    name: string
    description: string
  }
  signetRing: string
}

export enum PlayerColor {
  RED = 'red',
  GREEN = 'green',
  YELLOW = 'yellow',
  BLUE = 'blue'
}

export interface Player {
  id: number
  leader: Leader
  color: PlayerColor
  spice: number
  water: number
  solari: number
  troops: number
  agents: number
  hand: Card[]
  selectedCard: number | null
}

export interface SpaceProps {
  name: string
  type: 'conflict' | 'resource' | 'influence'
  resources?: {
    spice?: number
    water?: number
    solari?: number
    troops?: number
  }
  influence?: string // CHOAM, Spacing Guild, Bene Gesserit, Emperor
  maxAgents?: number
  occupied?: number[]
}

export enum AgentPlacementColor {
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  GRAY = 'gray',
  LIGHT_BLUE = 'lightblue',
  RED = 'red',
  PURPLE = 'purple'
}

export interface Card {
  id: number
  name: string
  persuasion?: number // Influence cost
  swordIcon?: boolean
  resources?: {
    spice?: number
    water?: number
    solari?: number
    troops?: number
  }
  effect?: string
  agentPlacement: AgentPlacementColor[]
}

export enum TurnType {
  ACTION = 'action',
  PASS = 'pass'
}

export interface ActionTurn {
  type: TurnType.ACTION
  playerId: number
  cardId: number
  agentFieldId: number
  specialEffectDecisions?: {
    [key: string]: any  // For flexibility with different card effects
  }
}

export interface PassTurn {
  type: TurnType.PASS
  playerId: number
  persuasionCount: number
  gainedEffects: string[]
  acquiredCards: number[]  // Card IDs from Imperium Row
}

export interface IntrigueCardPlay {
  cardId: number
  playedBefore: boolean  // Whether played before or after the main action
  effectDecisions?: {
    [key: string]: any
  }
}

export type GameTurn = {
  playedIntrigueCards?: IntrigueCardPlay[]
} & (ActionTurn | PassTurn)

export interface GameState {
  startingPlayerId: number
  currentRound: number
  activePlayerId: number
  combatCardId: number | null
  lastTurn: GameTurn | null
} 