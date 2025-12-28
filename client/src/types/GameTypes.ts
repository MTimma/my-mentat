export enum IntrigueCardType {
  COMBAT = 'combat',
  PLOT = 'plot',
  ENDGAME = 'endgame'
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

export interface InfluenceAmounts {
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
  reward?: Reward
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
  // Allow OR requirement groups with PlayReq-specific fields
  or?: PlayReq[]
  inPlay?: FactionType
}

export interface RevealReq extends CardEffectReq {
  // Allow OR requirement groups with RevealReq-specific fields
  or?: RevealReq[]
  bond?: FactionType
}

export interface CardEffectReq {
  // OR-group requirements: direct fields are ANDed, and if `or` is provided,
  // at least one sub-requirement must also be satisfied.
  or?: CardEffectReq[]
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
  influence?: InfluenceAmounts
  troops?: number
  retreatTroops?: number
  retreatUnits?: number
  deployTroops?: number
  custom?: string
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
  // Intrigue: while active this round, acquired cards may be put on top of deck instead of discard.
  acquireToTopThisRound?: boolean
  // Endgame tiebreaker modifier (e.g. “counts as 10 spice for tiebreakers”)
  tiebreakerSpice?: number
  custom?: CustomEffect
  influence?: InfluenceAmounts
}

export enum EffectTiming {
  IMMEDIATE = 'immediate',
  ON_REVEAL_THIS_ROUND = 'on-reveal-this-round'
}

export interface CardEffect<R extends CardEffectReq = CardEffectReq> {
  requirement?: R
  cost?: Cost
  reward: Reward
  choiceOpt?: boolean
  timing?: EffectTiming
  // Optional phase gating (primarily used for intrigue cards that can be used in multiple phases)
  phase?: GamePhase | GamePhase[]
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
    influence?: InfluenceAmounts,
    water?: number,
  }
}

export interface IntrigueCard extends Card {
  // Intrigue cards never have agent icons (rulebook: intrigue is not played as an Agent turn card)
  agentIcons: []
  type: IntrigueCardType
  description: string
  targetPlayer?: boolean
}

export interface ScheduledIntrigueEffect {
  cardId: number
  name: string
  image: string
  reward: Reward
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
  specialEffectDecisions?: Record<string, unknown>
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
  effectDecisions?: Record<string, unknown>
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

export interface PendingReward {
  id: string
  source: {
    type: GainSource
    id: number
    name: string
  }
  reward: Reward
  isTrash: boolean // true if reward.trash or reward.trashThisCard
  disabled?: boolean // true if the reward cannot be claimed (e.g., no valid targets)
  powerPlay?: boolean // true if this influence reward should grant +1 extra (Power Play effect)
}

// Mandatory OR-choice effect generated when a card lists multiple rewards with `effectOR`.
export interface ChoiceOption {
  cost?: Cost
  reward: Reward
  costLabel?: string
  rewardLabel?: string
  disabled?: boolean
}

// Card pile types for card selection
export enum CardPile {
  HAND = 'HAND',
  DISCARD = 'DISCARD',
  DECK = 'DECK',
  PLAY_AREA = 'PLAY_AREA'
}
export enum ChoiceType {
  FIXED_OPTIONS = 'FIXED_OPTIONS',
  CARD_SELECT = 'CARD_SELECT'
}

// Base interface for all pending choices
interface PendingChoiceBase {
  id: string
  prompt: string
  disabled?: boolean
  source: { type: GainSource; id: number; name: string }
}
// Fixed options choice (current reward selection system)
export interface FixedOptionsChoice extends PendingChoiceBase {
  type: ChoiceType.FIXED_OPTIONS
  options: ChoiceOption[] // one must be chosen
}

// Card selection choice
export interface CardSelectChoice extends PendingChoiceBase {
  type: ChoiceType.CARD_SELECT
  piles: CardPile[]
  filter?: (c: Card) => boolean
  selectionCount: number
  onResolve: (cardIds: number[]) => unknown // GameAction will be defined in GameContext
}

// Unified pending choice type
export type PendingChoice = FixedOptionsChoice | CardSelectChoice

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
  smfDiscount?: boolean // true if Guild Bankers discount is active for this reveal turn
  opponentDiscardState?: {
    effect: CustomEffect
    remainingOpponents: number[]
    currentOpponent?: number
    discardCounts?: Record<number, number> // Track how many cards each opponent has discarded
  }
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
  IMPERIUM_ROW_SETUP = 'imperium-row-setup',
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
  pendingRewards: PendingReward[]
  // Intrigue effects that will auto-resolve when the player takes their Reveal turn this round.
  scheduledIntrigueOnReveal: Record<number, ScheduledIntrigueEffect[]>
  // Intrigue cards that remain “active this round” (for UI attribution near Turn Controls).
  activeIntrigueThisRound: Record<number, IntrigueCard[]>
  // Intrigue modifier: during this player's Reveal turn this round, acquisitions may go to top of deck.
  acquireToTopThisRound: Record<number, boolean>
  // Endgame: additional spice considered for tiebreakers (from intrigue effects)
  endgameTiebreakerSpice: Record<number, number>
  // Endgame: players who have finished playing endgame intrigue
  endgameDonePlayers: Set<number>
  // Endgame: computed winners (after RESOLVE_ENDGAME)
  endgameWinners: number[] | null
  blockedSpaces?: Array<{ spaceId: number; playerId: number }> // Spaces blocked by The Voice
  // Pending Imperium Row replacement: when a card is acquired, track the index where replacement is needed
  pendingImperiumRowReplacement: { cardIndex: number } | null
}

export enum CustomEffect {
  OTHER_MEMORY = 'OTHER_MEMORY',
  CARRYALL = 'CARRYALL',
  GUN_THOPTER = 'GUN_THOPTER',
  KWISATZ_HADERACH = 'KWISATZ_HADERACH',
  LIET_KYNES = 'LIET_KYNES',
  SECRETS_STEAL = 'SECRETS_STEAL',
  POWER_PLAY = 'POWER_PLAY', // TODO need to implement
  REVEREND_MOTHER_MOHIAM = 'REVEREND_MOTHER_MOHIAM', // TODO need to implement
  TEST_OF_HUMANITY = 'TEST_OF_HUMANITY', // TODO need to implement
  THE_VOICE = 'THE_VOICE', // TODO need to implement
  GUILD_BANKERS = 'GUILD_BANKERS', // TODO need to implement
}

// Custom effects that are auto-applied and don't need user input
export const AUTO_APPLIED_CUSTOM_EFFECTS: CustomEffect[] = [
  CustomEffect.KWISATZ_HADERACH,
  CustomEffect.LIET_KYNES,
]