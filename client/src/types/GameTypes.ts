export enum CardType {
  PLOT = 'plot',
  COMBAT = 'combat',
  ENDGAME = 'endgame'
}

export enum IntrigueCardType {
  COMBAT = 'combat',
  PLOT = 'plot',
  ENDGAME = 'endgame'
}

export interface IntrigueCardEffect {
  // Combat effects
  strengthBonus?: number
  troopBonus?: number
  removeEnemyTroops?: number
  stealResource?: {
    type: 'spice' | 'water' | 'solari'
    amount: number
  }
  
  // Plot effects
  gainResource?: {
    type: 'spice' | 'water' | 'solari' | 'troops'
    amount: number
  }
  gainInfluence?: {
    faction: FactionType
    amount: number
  }
  drawCards?: number
  
  // Special conditions
  playCondition?: 'onWinCombat' | 'onLoseCombat' | 'onReveal' | 'immediate'
  targetPlayer?: boolean 
}

export interface IntrigueCard {
  id: number
  name: string
  type: IntrigueCardType
  effect: IntrigueCardEffect
  description: string
  oneTimeUse: boolean
}

// Contains display values for the leader
export class Leader {
  constructor(
    public name: string,
    public ability: {
      name: string
      description: string
    },
    public signetRingText: string,
    public complexity: 1 | 2 | 3, // Number of icons after name
    public sogChoice: boolean = false
  ) {} 
}

export interface MasterStroke {
  factions?: FactionType[]
  triggered: boolean
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
  intrigueCards: IntrigueCard[]
  deck: Card[]
  discardPile: Card[]
  hasHighCouncilSeat: boolean
  hasSwordmaster: boolean
}

export enum AgentIcon {
  CITY = 'city',
  SPICE_TRADE = 'spice-trade',
  LANDSRAAD = 'landsraad',
  EMPEROR = 'emperor',
  FREMEN = 'fremen',
  SPACING_GUILD = 'spacing-guild',
  BENE_GESSERIT = 'bene-gesserit'
}

export interface SpaceProps {
  id: number
  name: string
  agentIcon: AgentIcon
  resources?: {
    spice?: number
    water?: number
    solari?: number
    troops?: number
  }
  influence?: {
    faction: FactionType
    amount: number
  }
  maxAgents?: number
  occupiedBy?: number[]
  conflictMarker: boolean
  cost?: {
    spice?: number
    water?: number
    solari?: number
  }
  bonusSpice?: number
  requiresInfluence?: {
    faction: FactionType
    amount: number
  }
  oneTimeUse?: boolean
}

export interface Card {
  id: number
  name: string
  persuasion?: number
  swordIcon?: boolean
  resources?: {
    spice?: number
    water?: number
    solari?: number
    troops?: number
  }
  effect?: string
  agentIcons: AgentIcon[]
  fremenBond?: boolean
  acquireEffect?: string
  influenceRequirement?: {
    faction: FactionType
    amount: number
  }
  allianceRequirement?: FactionType
}

export enum FactionType {
  EMPEROR = 'emperor',
  SPACING_GUILD = 'spacing-guild',
  BENE_GESSERIT = 'bene-gesserit',
  FREMEN = 'fremen'
}

export enum TurnType {
  ACTION = 'action',
  PASS = 'pass'
}

export interface ActionTurn {
  type: TurnType.ACTION
  cardId: number
  agentSpaceId: number
  agentIcon: AgentIcon
  specialEffectDecisions?: Record<string, any>
}

export interface PassTurn {
  type: TurnType.PASS
  persuasionCount: number
  gainedEffects: string[]
  acquiredCards: number[]
}

export interface IntrigueCardPlay {
  cardId: number
  playedBefore: boolean
  effectDecisions?: Record<string, any>
}

export interface ConflictCard {
  id: number
  name: string
  rewards: {
    first: Reward[]
    second: Reward[]
    third?: Reward[]  // Only in 4-player game
  }
  controlSpace?: 'arrakeen' | 'carthag' | 'imperial-basin'
}

export type Reward = {
  type: 'victory-points' | 'spice' | 'water' | 'solari' | 'troops' | 'cards' | 'intrigue' | 'influence' | 'control'
  amount: number
  faction?: FactionType
}

export type GameTurn = {
  playerId: number
  canDeployTroops: boolean
  troopLimit: number
  removableTroops: number
  playedIntrigueCards?: IntrigueCardPlay[]
} & Partial<ActionTurn | PassTurn>

export interface GameState {
  startingPlayerId: number
  currentRound: number
  activePlayerId: number
  phase: GamePhase
  lastTurn: GameTurn | null
  mentatOwner: number | null
  factionInfluence: Record<FactionType, Record<number, number>>
  factionAlliances: Record<FactionType, number | null>
  controlMarkers: {
    arrakeen: number | null
    carthag: number | null
    imperialBasin: number | null
  }
  combatStrength: Record<number, number>
  combatTroops: Record<number, number>
  currentConflict: ConflictCard | null
  players: Player[]
}

export enum GamePhase {
  ROUND_START = 'round-start',
  PLAYER_TURNS = 'player-turns',
  COMBAT = 'combat',
  MAKERS = 'makers',
  RECALL = 'recall'
}

export interface PlayerSetup {
  leader: Leader
  color: PlayerColor
  playerNumber: number
  startOfGameChoice?: StartOfGameAbility
  startingDeck?: Card[]
}

export interface StartOfGameAbility {
    name?: MasterStroke //in the Base Game only Baron Harkonnen has a "start of game" ability - MasterStroke
} 

export interface MasterStroke extends StartOfGameAbility {
  factions?: FactionType[]
  triggered: boolean
}