export enum IntrigueCardType {
  COMBAT = 'combat',
  PLOT = 'plot',
  ENDGAME = 'endgame'
}

export interface IntrigueCardEffect {
  // Combat effects
  strengthBonus?: number
  deployTroops?: number
  removeEnemyTroops?: number
  
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
  color: PlayerColor
  leader: Leader
  troops: number
  spice: number
  water: number
  solari: number
  victoryPoints: number
  influence?: number
  agents: number
  persuasion: number
  combatValue: number
  hasSwordmaster: boolean
  hasHighCouncilSeat: boolean
  handCount: number
  revealed: boolean
  intrigueCount: number
  deck: Card[]
  discardPile: Card[]
  playArea: Card[]
  trash: Card[]
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

export interface InfluenceAmount {
  faction: FactionType
  amount: number
}

export enum MakerSpace {
  HAGGA_BASIN = 'hagga-basin',
  GREAT_FLAT = 'great-flat',
  IMPERIAL_BASIN = 'imperial-basin',
}

export interface SpaceProps {
  id: number
  name: string
  agentIcon: AgentIcon
  cost?: {
    spice?: number
    water?: number
    solari?: number
  }
  reward?: {
    spice?: number
    water?: number
    solari?: number
    troops?: number
    cards?: number
    intrigueCards?: number
    persuasion?: number
  }
  influence?: InfluenceAmount
  maxAgents?: number
  occupiedBy?: number[]
  conflictMarker: boolean
  
  makerSpace?: MakerSpace
  requiresInfluence?: InfluenceAmount
  controlMarker?: ControlMarkerType
  controlBonus?: {
    spice?: number
    solari?: number
  }
  specialEffect?: 'mentat' | 'swordmaster' | 'foldspace' | 'secrets' | 'selectiveBreeding' | 'sellMelange' | 'highCouncil'
}

export interface CardEffect {
  requirement?: {
    influence?: InfluenceAmount
    alliance?: FactionType
    bond?: FactionType
  }
  cost?: {
    spice?: number
    water?: number
    solari?: number
    trashThisCard?: boolean
    discard?: number
    influence?: InfluenceAmount
    troops?: number
    retreatTroops?: number
    retreatUnits?: number
    deployTroops?: number
  }
  reward: {
    persuasion?: number
    combat?: number
    spice?: number
    water?: number
    solari?: number
    troops?: number
    drawCards?: number
    victoryPoints?: number
    intrigueCards?: number
    trash?: number
    trashThisCard?: boolean
    retreatTroops?: number
    retreatUnits?: number
    deployTroops?: number
  }
  effectOR?: boolean
}

export interface Gain {
  playerId: number
  source: GainSource
  sourceId: number
  round: number
  name: string
  amount: number
  type: RewardType
}

export enum GainSource {
  CARD = 'card',
  FIELD = 'field',
  CONTROL = 'control',
  INTRIGUE = 'intrigue',
  CONFLICT = 'conflict',
  HIGH_COUNCIL = 'high-council',
  MENTAT = 'mentat'
}

export interface Card {
  id: number
  name: string
  faction?: FactionType
  cost?: number
  agentIcons: AgentIcon[]
  playEffect?: CardEffect[]
  revealEffect?: CardEffect[]
  acquireEffect?: {
    victoryPoints?: number,
    spice?: number,
    troops?: number,
    trash?: number,
    influence?: InfluenceAmount[],
    water?: number,
  }
}

export enum FactionType {
  EMPEROR = 'emperor',
  SPACING_GUILD = 'spacing-guild',
  BENE_GESSERIT = 'bene-gesserit',
  FREMEN = 'fremen'
}

export enum ControlMarkerType {
  ARRAKIN = 'arrakin',
  CARTHAG = 'carthag',
  IMPERIAL_BASIN = 'imperial-basin'
}

export enum TurnType {
  ACTION = 'action',
  PASS = 'pass',
  REVEAL = 'reveal'
}

export interface ActionTurn {
  type: TurnType.ACTION
  cardId: number
  agentSpaceId: number
  agentIcon: AgentIcon
  specialEffectDecisions?: Record<string, any>
}

export interface RevealTurn {
  type: TurnType.REVEAL
  persuasionCount: number
  gainedEffects: string[]
  acquiredCards: number[]
}

export interface PassTurn {
  type: TurnType.PASS
}

export interface IntrigueCardPlay {
  cardId: number
  effectDecisions?: Record<string, any>
}

export interface Reward {
  type: RewardType
  amount: number
}

export interface Winners {
  first: number[] | null
  second: number[] | null
  third: number[] | null
}

export interface ConflictCard {
  id: number
  tier: 1 | 2 | 3
  name: string
  controlSpace?: ControlMarkerType
  rewards: {
    first: Reward[]
    second: Reward[]
    third: Reward[]
  }
}

export interface GameTurn {
  playerId: number
  type: TurnType
  cardId?: number
  agentSpace?: AgentIcon
  canDeployTroops?: boolean
  troopLimit?: number
  removableTroops?: number
  persuasionCount?: number
  gainedEffects?: string[]
  acquiredCards?: Card[]
  playedIntrigueCard?: IntrigueCardPlay[]
}

export enum GamePhase {
  ROUND_START = 'round-start',
  PLAYER_TURNS = 'player-turns',
  COMBAT = 'combat',
  COMBAT_REWARDS = 'combat-rewards',
  MAKERS = 'makers',
  RECALL = 'recall',
  END_GAME = 'end-game'
}

export enum ScreenState {
  SETUP = 'setup',
  LEADER_CHOICES = 'leader-choices',
  ROUND_START = 'round-start',
  GAME = 'game',
  CONFLICT = 'conflict'
}

export enum RewardType {
  VICTORY_POINTS = 'VP',
  INTRIGUE = 'Intrigue',
  SOLARI = 'Solari',
  SPICE = 'Spice',
  WATER = 'Water',
  INFLUENCE = 'Influence',
  CONTROL = 'Control',
  AGENT = 'Agent',
  COMBAT = 'Combat',
  TROOPS = 'Troops',
  DRAW = 'Draw',
  DISCARD = 'Discard',
  TRASH = 'Trash',
  RETREAT = 'Retreat',
  DEPLOY = 'Deploy',
  RECALL = 'Recall',
  PERSUASION = 'Persuasion'
}

export interface PlayerSetup {
  leader: Leader
  color: PlayerColor
  playerNumber: number
  deck: Card[]
  startingHand: Card[]
}

export interface GameState {
  phase: GamePhase
  factionInfluence: Record<FactionType, Record<number, number>>
  factionAlliances: Record<FactionType, number | null>
  spiceMustFlowDeck: Card[]
  arrakisLiaisonDeck: Card[]
  foldspaceDeck: Card[]
  imperiumRowDeck: Card[]
  imperiumRow: Card[]
  intrigueDeck: IntrigueCard[]
  intrigueDiscard: IntrigueCard[]
  conflictsDiscard: ConflictCard[]
  controlMarkers: Record<ControlMarkerType, number | null>
  bonusSpice: Record<MakerSpace, number>
  history: GameState[]
  players: Player[]
  firstPlayerMarker: number
  currentRound: number
  mentatOwner: number | null
  activePlayerId: number
  gains: Gain[]
  selectedCard: number | null
  currTurn: GameTurn | null
  combatStrength: Record<number, number>
  combatTroops: Record<number, number>
  currentConflict: ConflictCard
  combatPasses: Set<number>
  occupiedSpaces: Record<number, number[]>
  playArea: Record<number, Card[]>
  canEndTurn: boolean
  canAcquireIR: boolean
}