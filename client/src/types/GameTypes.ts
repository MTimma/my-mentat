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
  combatValue: number
  agents: number
  hand: Card[]
  selectedCard: number | null
}

export interface SpaceProps {
  id: number
  name: string
  agentPlacementArea: AgentSpaceType
  resources?: {
    spice?: number
    water?: number
    solari?: number
    troops?: number
  }
  influence?: {
    faction: 'emperor' | 'spacing-guild' | 'bene-gesserit' | 'fremen'
    amount: number
  }
  maxAgents?: number
  occupiedBy?: number[]  // Player IDs who have placed agents here
  conflictMarker: boolean
}

export enum AgentSpaceType {
  POPULATED_AREAS = 'populated-areas',
  LANDSRAAD = 'landsraad',
  DESERTS = 'deserts',
  EMPEROR = 'emperor',
  FREMEN = 'fremen',
  SPACING_GUILD = 'spacing-guild',
  BENE_GESSERIT = 'bene-gesserit'
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
  agentSpaceTypes: AgentSpaceType[]
}

export enum TurnType {
  ACTION = 'action',
  PASS = 'pass'
}

export interface ActionTurn {
  type: TurnType.ACTION
  cardId: number
  agentSpaceId: number
  agentSpaceType: AgentSpaceType
  specialEffectDecisions?: {
    [key: string]: any  // For flexibility with different card effects
  }
}

export interface PassTurn {
  type: TurnType.PASS
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
  playerId: number,
  canDeployTroops: boolean,
  troopLimit: number,
  removableTroops: number,
  playedIntrigueCards?: IntrigueCardPlay[]
} & Partial<ActionTurn | PassTurn>

export interface GameState {
  startingPlayerId: number
  currentRound: number
  activePlayerId: number
  combatCardId: number | null
  lastTurn: GameTurn | null
} 