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

export const ALL_AGENT_ICONS: AgentIcon[] =
  Object.values(AgentIcon) as AgentIcon[];

export interface InfluenceReward {
  amounts: InfluenceAmount[]
  chooseOne?: boolean
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

export interface SpaceCostReward {
  cost?: {
    solari?: number
    trash?: number
  }
  reward?: {
    spice?: number
    cards?: number
  }
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
  effects?:[{
    cost?: Cost
    reward: Reward
  }]
  influence?: InfluenceAmount
  maxAgents?: number
  occupiedBy?: number[]
  conflictMarker: boolean
  image?: string
  makerSpace?: MakerSpace
  requiresInfluence?: InfluenceAmount
  controlMarker?: ControlMarkerType
  controlBonus?: {
    spice?: number
    solari?: number
  }
  specialEffect?: 'mentat' | 'swordmaster' | 'foldspace' | 'secrets' | 'selectiveBreeding' | 'highCouncil'
}

export interface PlayReq extends CardEffectReq {
  inPlay?: FactionType
}

export interface RevealReq extends CardEffectReq {
  bond?: FactionType
}

export interface CardEffectReq {
  influence?: InfluenceAmount
  alliance?: FactionType
}

export type PlayEffect = CardEffect<PlayReq> & {
  beforePlaceAgent?: { recallAgent?: boolean } // This is only used for Kwisatz Haderach
}
export type RevealEffect = CardEffect<RevealReq>

export interface Cost {
  spice?: number
  water?: number
  solari?: number
  trashThisCard?: boolean
  trash?: number
  discard?: number
  influence?: InfluenceAmount
  troops?: number
  retreatTroops?: number
  retreatUnits?: number
  deployTroops?: number
}

export interface Reward {
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
  custom?: string
  influence?: InfluenceReward
}

export interface CardEffect<R extends CardEffectReq = CardEffectReq> {
  requirement?: R
  cost?: Cost
  reward: Reward
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
  BOARD_SPACE = 'board-space',
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
  image: string
  faction?: FactionType[]
  cost?: number
  agentIcons: AgentIcon[]
  infiltrate?: boolean
  trashEffect?: CardEffect[]
  playEffect?: PlayEffect[]
  revealEffect?: RevealEffect[]
  acquireEffect?: {
    victoryPoints?: number,
    spice?: number,
    troops?: number,
    trash?: number,
    influence?: InfluenceReward,
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

export interface ConflictReward {
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
    first: ConflictReward[]
    second: ConflictReward[]
    third: ConflictReward[]
  }
}

export interface OptionalEffect {
  id: string
  cost: Cost
  reward: Reward
  source: { type: GainSource; id: number; name: string }
  data?: { trashedCardId?: number }
}

// Mandatory OR-choice effect generated when a card lists multiple rewards with `effectOR`.
export interface ChoiceOption {
  reward: Reward
  disabled?: boolean
}

export interface PendingChoice {
  id: string
  options: ChoiceOption[] // one must be chosen
  source: { type: GainSource; id: number; name: string }
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
  optionalEffects?: OptionalEffect[]
  pendingChoices?: PendingChoice[]
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
  GAME_STATE_SETUP = 'game-state-setup',
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