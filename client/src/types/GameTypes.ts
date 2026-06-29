export enum IntrigueCardType {
  COMBAT = 'combat',
  PLOT = 'plot',
  ENDGAME = 'endgame'
}

import type { PlayerTechTile, TechTileId } from '../data/techTiles'
import type { BoardSetId } from '../expansions/types'

// Contains display values for the leader
export class Leader {
  constructor(
    public name: string,
    public ability: {
      name: string
      description: string
    },
    public signetRingText: string,
    public complexity: 1 | 2 | 3 | 4, // Number of icons after name (4 = Tessia Vernius)
    public sogChoice: boolean = false
  ) {}
  /** Optional display title for the signet ring (e.g. "Hidden Reservoir", "Scheme"). */
  public signetRingTitle?: string
  /** Rise of Ix — marks one of the six RoI leaders. */
  public riseOfIx?: boolean
  /** Tessia Vernius only — snoopers parked on the leader mat (per faction). */
  public tessiaSnoopers?: Partial<Record<FactionType, boolean>>
  /** Tessia Vernius only — next leader-mat reward slot to grant (1–4). */
  public tessiaSnooperRewardSlot?: number
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
  /** Troops in the bank (not garrison, conflict, or on Ix). Max 12 total pieces per player. */
  troopSupply?: number
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
  /** Rise of Ix — optional until expansion is enabled. */
  dreadnoughts?: {
    supply: number
    garrison: number
    conflict: number
    control: Array<{ space: ControlMarkerType; placedRound: number }>
  }
  /** CHOAM Shipping track position (0 = bottom, 3 = top). */
  freighterStep?: 0 | 1 | 2 | 3
  /** Acquired tech tiles (face-up / face-down). */
  tech?: PlayerTechTile[]
  /** Negotiators placed on the Ix board (similar to conflict-deployed troops). */
  negotiatorsOnIx?: number
  /** Tessia Vernius — per-faction snooper placement on influence tracks. */
  snoopers?: Partial<Record<FactionType, boolean>>
  /** Ilesa Ecaz — card set aside at round start. */
  setAsideCard?: Card | null
  /** Ilesa Ecaz — awaiting round-start set-aside choice. */
  ilesaSetAsidePending?: boolean
  /** Agent turns taken this round (for Ilesa 2nd-turn bonus). */
  agentTurnsThisRound?: number
  /** Rise of Ix — tech tiles activated this round (once-per-round timings). */
  activatedTechThisRound?: TechTileId[]
  /** Immortality — troop pieces placed in the Axolotl tanks (specimen currency). */
  specimens?: number
  /**
   * Immortality — current research-track node id (branching hex graph).
   * `undefined` ⇒ the leftmost start node. See `expansions/immortality/researchTrack.ts`.
   */
  researchNodeId?: string
  /** Immortality — Tleilaxu (beetle) track position (0 = leftmost start). */
  tleilaxuStep?: number
  /** Immortality — Family Atomics token spent (once per game). */
  familyAtomicsUsed?: boolean
}

/**
 * Board agent icons. Rise of Ix board spaces reuse existing icons
 * (Landsraad, Spice Trade) — no IX or CHOAM enum members are added.
 * Tech Negotiator and Acquire Tech on cards are `Reward` fields, not agent icons.
 */
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
  effects?: {
    cost?: Cost
    reward: Reward
    /** Per rules, Acquire Tech / Tech Negotiator on board spaces are optional ("may"). */
    optional?: boolean
  }[]
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
  specialEffect?: 'mentat' | 'swordmaster' | 'foldspace' | 'secrets' | 'selectiveBreeding' | 'highCouncil' | 'sellMelange'
  /** Rise of Ix — CHOAM-overlay board space. */
  riseOfIx?: boolean
  /** Immortality — Bene Tleilax board replacement space (same id as a base space). */
  immortality?: boolean
  /** Hotspot panel: main board vs Ix side panel. */
  gridSide?: 'main' | 'ix'
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
  /**
   * Immortality — effect is only active once the player's research token has
   * reached the given genetic marker (1 = first/`~3 steps`, 2 = second/end).
   * Used for both genetic-symbol card effects and "Research lvl N" text.
   */
  researchLevel?: 1 | 2
  /**
   * Immortality — effect is only active when this card is grafted with another
   * (the "if grafted" clause on several Tleilaxu cards).
   */
  grafted?: boolean
}

export interface IntrigueReq extends CardEffectReq {
  or?: IntrigueReq[]
  highCouncil?: boolean
}

export type PlayEffect = CardEffect<PlayReq> & {
  beforePlaceAgent?: { recallAgent?: boolean } // This is only used for Kwisatz Haderach
}
export type RevealEffect = CardEffect<RevealReq>
export type IntriguePlayEffect = CardEffect<IntrigueReq>

export interface Cost {
  spice?: number
  water?: number
  solari?: number
  trashThisCard?: boolean
  trash?: number
  discard?: number
  influence?: InfluenceAmounts
  troops?: number
  /** Rise of Ix — pay troop pieces from supply (not garrison). */
  poolTroop?: number
  retreatTroops?: number
  retreatUnits?: number
  deployTroops?: number
  /** Rise of Ix — pay dreadnoughts from supply/garrison. */
  dreadnoughts?: number
  /** Rise of Ix — return negotiators from Ix (amount chosen at resolve time). */
  negotiator?: boolean
  /** Rise of Ix — place N intrigue cards on the bottom of the intrigue deck. */
  intrigueBottom?: number
  /** Immortality — spend N specimens from the Axolotl tanks. */
  specimen?: number
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
  mentat?: boolean
  // Intrigue: while active this round, acquired cards may be put on top of deck instead of discard.
  acquireToTopThisRound?: boolean
  // Endgame tiebreaker modifier (e.g. "counts as 10 spice for tiebreakers")
  tiebreakerSpice?: number
  custom?: CustomEffect
  influence?: InfluenceAmounts
  // Acquire effect: allows acquiring a card from Imperium Row with a cost limit
  acquire?: {
    limit: number
  }
  /** Urgent Mission: recall agent from this board space id */
  recallSpaceId?: number
  /** Master Tactician: retreat this many troops from Conflict to garrison */
  retreatFromConflict?: number
  /** Rise of Ix — commission N dreadnoughts from supply. */
  dreadnoughts?: number
  /** Rise of Ix — when commissioning on a combat space, deploy directly to Conflict. */
  dreadnoughtToConflict?: boolean
  /** Rise of Ix — place a winning dreadnought on this control space. */
  dreadnoughtControlSpace?: ControlMarkerType
  /** Rise of Ix — advance N spaces on Shipping track, or recall and collect rewards. */
  freighter?: number | 'recall'
  /** Rise of Ix — acquire one tech tile, optionally with a built-in spice discount. */
  acquireTech?: { discount?: 0 | 1 | 2; paySolariInsteadOfSpice?: boolean }
  /** Rise of Ix — place N negotiators on Ix. */
  techNegotiator?: number
  /** Rise of Ix — +5 solari to active player; reducer expands to all players. */
  dividends?: true
  /** Nested reward applied to each opponent (e.g. dividends: 1 solari each). */
  forOpponents?: Reward
  /** Immortality — generate N specimens (troop pieces into the Axolotl tanks). */
  specimen?: number
  /** Immortality — advance the research token N times (branch choice at resolve). */
  research?: number
  /** Immortality — advance the Tleilaxu (beetle) token N spaces. */
  tleilaxu?: number
  /** Immortality — Combat icon: may deploy troops this turn as if on a combat space. */
  combatDeploy?: boolean
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
  /** When true, or by default for acquireTech / techNegotiator rewards ("may" icons). */
  optional?: boolean
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
  MENTAT = 'mentat',
  MASTERSTROKE = 'masterstroke',
  LEADER_ABILITY = 'leader-ability',
  MEMNON_HIGH_COUNCIL = 'memnon-high-council',
  /** Rise of Ix — gain tied to a tech tile firing. */
  TECH = 'tech',
  /** Rise of Ix — gain tied to acquiring a tech tile from the Ix board. */
  IX_BOARD = 'ix-board',
  /** Rise of Ix — gain from freighter recall on the Shipping track. */
  SHIPPING_TRACK = 'shipping-track',
  /** Rise of Ix — Tessia Vernius snooper leader-mat reward. */
  TESSIA_SNOOPER = 'tessia-snooper',
  /** Immortality — gain tied to the research track. */
  RESEARCH_TRACK = 'research-track',
  /** Immortality — gain tied to the Tleilaxu track. */
  TLEILAXU_TRACK = 'tleilaxu-track',
}

export interface Card {
  id: number
  name: string
  image: string
  faction?: FactionType[]
  cost?: number
  agentIcons: AgentIcon[]
  /** Ignore occupancy on one Agent placement (base + Rise of Ix infiltration cards). */
  infiltrate?: boolean
  /** Rise of Ix — Reveal effects also fire when this card is discarded or trashed. */
  unload?: boolean
  /** Rise of Ix — source marker for UI badge and deck filtering. */
  riseOfIx?: boolean
  /** Immortality — source marker for UI badge and deck filtering. */
  immortality?: boolean
  /** Immortality — this card belongs to the Tleilaxu Row (acquired with specimens). */
  tleilaxu?: boolean
  /** Immortality — card has a Graft agent box (must be played as a pair on an Agent turn). */
  graft?: boolean
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
    /** Rise of Ix — acquire-time freighter icon(s). */
    freighter?: number
    /** Rise of Ix — commission dreadnought(s) on acquire. */
    dreadnoughts?: number
  }
}

export interface IntrigueCard extends Card {
  // Intrigue cards never have agent icons (rulebook: intrigue is not played as an Agent turn card)
  agentIcons: []
  type: IntrigueCardType
  description: string
  targetPlayer?: boolean
  playEffect?: IntriguePlayEffect[]  // Override to use IntriguePlayEffect instead of PlayEffect
}

export interface ScheduledIntrigueEffect {
  cardId: number
  name: string
  image: string
  reward: Reward
}

export interface ScheduledGraftEffect {
  type: 'chairdog-return'
  chairdogCardId: number
  partnerCardId: number
  partnerName: string
  name: string
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
  /** Optional payment before receiving this reward (e.g. purchasable VP on Economy Supremacy). */
  cost?: Cost
  /** When set, player chooses one of these options instead of receiving this reward directly */
  choiceOptions?: ConflictReward[]
  /** When true for INFLUENCE, player chooses which faction to gain influence with */
  chooseFaction?: boolean
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

// Card pile types for card selection UI
export enum CardPile {
  /** Rules “from hand”: deck in this app (played cards live in playArea, not deck). */
  HAND = 'HAND',
  DISCARD = 'DISCARD',
  /** Same as HAND — deck is the selectable draw pile. */
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
export interface InfluenceResolutionMeta {
  /** Paid when the player confirms the lose-influence choice (before applying that choice). */
  payOnResolve?: Cost
  /** After lose-influence resolves, prompt to gain influence with any faction. */
  thenGain?: InfluenceAmounts
}

export interface FixedOptionsChoice extends PendingChoiceBase {
  type: ChoiceType.FIXED_OPTIONS
  options: ChoiceOption[] // one must be chosen
  influenceResolution?: InfluenceResolutionMeta
}

// Card selection choice
export interface CardSelectChoice extends PendingChoiceBase {
  type: ChoiceType.CARD_SELECT
  piles: CardPile[]
  cards?: Card[] // Optional: cards to select from directly (e.g., Imperium Row)
  filter?: (c: Card) => boolean
  selectionCount: number
  /** When set, selection must use hand cards first, then draw pile for any remainder. */
  discardCost?: number
  onResolve: (cardIds: number[]) => unknown // GameAction will be defined in GameContext
}

// Unified pending choice type
export type PendingChoice = FixedOptionsChoice | CardSelectChoice

/** Minimal tech tile snapshot for turn-history acquired rows. */
export interface AcquiredTechTileSnapshot {
  id: TechTileId
  name: string
  image: string
  cost: number
}

export interface GameTurn {
  playerId: number
  type: TurnType
  cardId?: number
  agentSpace?: AgentIcon
  /** Board space id for this agent placement (Power Play bonus influence). */
  agentSpaceId?: number
  canDeployTroops?: boolean
  troopLimit?: number
  /** Slots that may only be filled by troops from a "deploy these troops" reward (e.g. Gurney). */
  theseTroopsDeployLimit?: number
  /** Troops deployed this turn via theseTroopsDeployLimit (subset of removableTroops). */
  removableTheseTroops?: number
  /** Troops still in Conflict that may be retreated this turn. */
  removableTroops?: number
  /** Dreadnoughts deployed to Conflict this turn (undo via UNDEPLOY_DREADNOUGHT). */
  removableDreadnoughts?: number
  /** Negotiators deployed from Ix to Conflict this turn (undo via UNDEPLOY_NEGOTIATOR). */
  removableNegotiators?: number
  /** Total dreadnoughts sent to Conflict this turn. */
  dreadnoughtsDeployedToConflict?: number
  /** Total troops sent to Conflict this turn (does not decrease on retreat). */
  troopsDeployedToConflict?: number
  /** Total troops retreated from Conflict this turn. */
  troopsRetreatedFromConflict?: number
  /** Diversion intrigue — grant freighter when 4+ units are in the Conflict this turn. */
  diversionActive?: boolean
  /** Diversion — freighter reward was granted and may be reverted if units drop below 4. */
  diversionFreighterGranted?: boolean
  /** Diversion — freighter step before the Diversion grant (for revert). */
  diversionFreighterStepBefore?: 0 | 1 | 2 | 3
  /** Diversion — pending choice ids created by the Diversion freighter grant. */
  diversionFreighterChoiceIds?: string[]
  /** Max troops that may be retreated via card/leader effects (separate from deploy undo). */
  effectRetreatAllowance?: number
  /** Troops already retreated via effect allowance this turn. */
  effectRetreatsUsed?: number
  /** Index into `GameState.gains` where this turn's gains begin (history scoping). */
  gainsStartIndex?: number
  persuasionCount?: number
  gainedEffects?: string[]
  acquiredCards?: Card[]
  /** Ix board tech tiles bought this turn (turn history acquired row). */
  acquiredTechTiles?: AcquiredTechTileSnapshot[]
  revealedCardIds?: number[]
  playedIntrigueCard?: IntrigueCardPlay[]
  optionalEffects?: OptionalEffect[]
  pendingChoices?: PendingChoice[]
  smfDiscount?: boolean // true if Guild Bankers discount is active for this reveal turn
  opponentDiscardState?: {
    effect: CustomEffect
    remainingOpponents: number[]
    currentOpponent?: number
    discardCounts?: Record<number, number> // Track how many cards each opponent has discarded
    /** Card that triggered the discard effect (e.g. Reverend Mother Mohiam). */
    sourceCardId?: number
    sourceCardName?: string
  }
  /** Twisted Mentat (Immortality graft) — may recall the agent just placed this turn. */
  canRecallPlacedAgent?: boolean
  /** Weirding Way — player may take another Agent/Reveal turn before rotation. */
  extraTurnAllowed?: boolean
  /** Treachery — deploy allowance must be used before ending turn. */
  mandatoryDeployTroops?: boolean
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
  CARD_CREATOR = 'card-creator',
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
  /** Weirding Way — may take another Agent/Reveal turn before rotation. */
  EXTRA_TURN = 'Extra turn',
  COMBAT = 'Combat',
  TROOPS = 'Troops',
  /** Rise of Ix — troop piece in supply (not garrison). */
  POOL_TROOP = 'Pool troop',
  CARD = 'Card',
  DRAW = 'Draw',
  DISCARD = 'Discard',
  TRASH = 'Trash',
  RETREAT = 'Retreat',
  DEPLOY = 'Deploy',
  RECALL = 'Recall',
  PERSUASION = 'Persuasion',
  MENTAT = "Mentat",
  SWORDMASTER = "Swordmaster",
  /** Rise of Ix */
  DREADNOUGHT = 'Dreadnought',
  FREIGHTER = 'Freighter',
  TECH = 'Tech',
  NEGOTIATOR = 'Negotiator',
  /** Immortality */
  SPECIMEN = 'Specimen',
  RESEARCH = 'Research',
  TLEILAXU = 'Tleilaxu',
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
  /** Pre–imperium/conflict configuration snapshot; restored by setup undo. */
  setupBaseline?: GameState | null
  players: Player[]
  firstPlayerMarker: number
  currentRound: number
  mentatOwner: number | null
  /** Player ids in order they first took a High Council seat (for board UI). */
  highCouncilSeatOrder: number[]
  activePlayerId: number
  gains: Gain[]
  selectedCard: number | null
  /** Index in `players[activePlayerId].deck` for the card chosen in PLAY_CARD (disambiguates duplicate template ids). */
  selectedCardDeckIndex: number | null
  currTurn: GameTurn | null
  combatStrength: Record<number, number>
  combatTroops: Record<number, number>
  /** Rise of Ix — negotiators deployed from Ix to the Conflict. */
  combatNegotiators?: Record<number, number>
  currentConflict: ConflictCard
  combatPasses: Set<number>
  occupiedSpaces: Record<number, number[]>
  playArea: Record<number, Card[]>
  canEndTurn: boolean
  canAcquireIR: boolean
  pendingRewards: PendingReward[]
  // Intrigue effects that will auto-resolve when the player takes their Reveal turn this round.
  scheduledIntrigueOnReveal: Record<number, ScheduledIntrigueEffect[]>
  /** Immortality — graft effects that resolve at the start of Reveal (e.g. Chairdog). */
  scheduledGraftOnReveal?: Record<number, ScheduledGraftEffect[]>
  // Intrigue cards that remain “active this round” (for UI attribution near Turn Controls).
  activeIntrigueThisRound: Record<number, IntrigueCard[]>
  // Intrigue modifier: during this player's Reveal turn this round, acquisitions may go to top of deck.
  acquireToTopThisRound: Record<number, boolean>
  // Endgame: additional spice considered for tiebreakers (from intrigue effects)
  endgameTiebreakerSpice: Record<number, number>
  // Endgame: players who have finished playing endgame intrigue
  endgameDonePlayers: Set<number>
  /** Endgame: players who have manually selected which intrigue cards to reveal. */
  endgameRevealDonePlayers?: Set<number>
  // Endgame: computed winners (after RESOLVE_ENDGAME)
  endgameWinners: number[] | null
  blockedSpaces?: Array<{ spaceId: number; playerId: number }> // Spaces blocked by The Voice
  // Pending Imperium Row replacement: when a card is acquired, track the index where replacement is needed
  pendingImperiumRowReplacement: { cardIndex: number } | null
  // Pending conflict reward choices: when a conflict reward requires player choice (e.g. Cloak and Dagger 3rd, Machinations 1st)
  pendingConflictRewardChoices?: Array<{
    id: string
    playerId: number
    placement: string
    conflictId: number
    conflictName: string
    options: ChoiceOption[]
  }>
  // Stored when combat resolution is deferred for choices; used when completing the transition
  combatResolutionDeferred?: {
    mentatOwnerNextRound: number | null
  }
  /** Conflict id whose immediate (non-choice) rewards were already applied this combat. */
  combatRewardsResolvedConflictId?: number | null
  // Helena signet ring: card removed from Imperium Row this round; that player may acquire it for 1 less during Reveal
  helenaRemovedCard?: { cardId: number; playerId: number; card: Card } | null
  /** Dispatch an Envoy: next Agent placement only — unions four faction icons with that card for board matching. Cleared after Agent placement or when Reveal resolves (no effect on revealed cards). */
  dispatchEnvoyActive?: Record<number, boolean>
  /** Infiltrate intrigue: next Agent placement ignores enemy occupancy once */
  infiltrateIgnoreOccupancyOnce?: Record<number, boolean>
  /** Rapid Mobilization: player must choose how many garrison troops to deploy */
  pendingRapidMobilization?: number | null
  /** To the Victor…: if true, grant 3 spice when this player wins the current Conflict */
  pendingVictorSpiceThisCombat?: Record<number, boolean>
  /** Strategic Push: if true, grant 2 solari when this player wins the current Conflict */
  pendingVictorSolariThisCombat?: Record<number, boolean>
  /** Second Wave: player must deploy up to 2 garrison units to the Conflict */
  pendingSecondWave?: number | null
  /** Labels a row in `history` (setup baseline, round start, combat resolution, endgame). */
  historyEntryKind?: 'setup' | 'round-start' | 'combat' | 'endgame'
  /** All intrigue cards revealed at endgame, keyed by player id. */
  endgameRevealedIntrigue?: Record<number, IntrigueCard[]>
  /** Endgame-effect cards still waiting to be applied (may require choices). */
  endgameApplyQueue?: Array<{ playerId: number; cardId: number }>
  /** Sandbox mode: true while the single freeform setup turn is in progress; cleared by SANDBOX_COMMIT_SETUP. */
  sandboxSetup?: boolean
  /** Sandbox setup only: optional starting round/turn (null = imaginary position, no label). */
  sandboxSetupPosition?: SandboxSetupPosition
  /** Added to computed live player-turn numbers (sandbox mid-round starts). */
  playerTurnNumberOffset?: number
  /** When true, play chrome omits the round number (imaginary sandbox position). */
  hideRoundLabel?: boolean
  /** Expansion flags — configuration, not mutated during play. */
  expansions: Expansions
  /** Base board set (from the game pack). Missing ⇒ `'imperium'`. */
  boardSet?: BoardSetId
  /** Rise of Ix — tech tile stacks on the Ix board (undefined when RoI is off). */
  ixBoard?: {
    stacks: TechTileId[][]
    nextFaceUpRevealed: Record<number, boolean>
  }
  /** Rise of Ix — player id with a dreadnought on each control space. */
  dreadnoughtCover?: Record<ControlMarkerType, number | null>
  /** Rise of Ix — player may acquire a tech tile with this spice discount (from board reward). */
  pendingAcquireTech?: {
    playerId: number
    discount: number
    /** Appropriate: pay tile cost in Solari at 1:1 instead of spice. */
    paySolariInsteadOfSpice?: boolean
  } | null
  /** Rise of Ix — Heighliner spice discount for active player this turn (Guild Accord). */
  heighlinerDiscountThisTurn?: Record<number, number>
  /**
   * Immortality — the two purchasable Tleilaxu Row cards (Reclaimed Forces is a
   * permanent reserve rendered separately and never stored here). Undefined when
   * Immortality is off.
   */
  tleilaxuRow?: Card[]
  /** Immortality — remaining Tleilaxu deck pool for manual refills (no shuffle). */
  tleilaxuRowDeck?: Card[]
  /** Immortality — pending Imperium Row replacement count after Family Atomics. */
  pendingTleilaxuRowReplacement?: { cardIndex: number } | null
  /** Immortality — the 2 setup spice on the Tleilaxu-track VP space, until claimed. */
  tleilaxuTrackBonusSpice?: number
  /** Immortality — true once the first player to reach the VP space took the bonus spice. */
  tleilaxuTrackBonusClaimed?: boolean
  /**
   * Immortality — a player owes a research-track branch decision. The reducer
   * sets this when a `research` reward is gained with more than one valid
   * forward branch; the UI resolves it via ADVANCE_RESEARCH.
   */
  pendingResearchAdvance?: {
    playerId: number
    /** Remaining research advances still owed after the current decision. */
    remaining: number
  } | null
  /**
   * Immortality — active graft pairing for the current Agent turn: the two card
   * instance ids played together. Cleared at end of turn.
   */
  graftPair?: { cardIds: number[] } | null
  /**
   * Immortality — waiting for the second graft card (or Imperium Row pick for Usurp).
   */
  pendingGraftPartner?: {
    primaryCardId: number
    primaryDeckIndex: number
    requiresImperiumRow?: boolean
  } | null
  /**
   * Immortality — Usurp borrowed an Imperium Row card for this agent turn; trashed at end of turn.
   */
  usurpBorrowed?: { card: Card; rowIndex: number } | null
}

export interface Expansions {
  riseOfIx: boolean
  /** Reserved — not implemented in this iteration. */
  riseOfIxEpic: boolean
  /**
   * Immortality (Bene Tleilax board, Tleilaxu Row, specimens, graft).
   * Optional so legacy `Expansions` literals/saves remain valid; treat
   * `undefined` as `false` (see `normalizeExpansions` / `NO_EXPANSIONS`).
   */
  immortality?: boolean
}

export const NO_EXPANSIONS: Expansions = {
  riseOfIx: false,
  riseOfIxEpic: false,
  immortality: false,
}

/** Backwards-compatible default when loading state without `expansions`. */
export function normalizeExpansions(expansions?: Expansions | null): Expansions {
  if (!expansions) return NO_EXPANSIONS
  return { ...NO_EXPANSIONS, ...expansions }
}

export interface SandboxSetupPosition {
  /** Starting round when play begins; null = imaginary (no round shown). */
  round: number | null
  /** 1-based player turn when play begins; null = turn 1. */
  playerTurn: number | null
}

/** Faction agent icons added by Dispatch an Envoy (union with card icons). */
export const DISPATCH_ENVOY_FACTION_ICONS: AgentIcon[] = [
  AgentIcon.EMPEROR,
  AgentIcon.SPACING_GUILD,
  AgentIcon.BENE_GESSERIT,
  AgentIcon.FREMEN
]

export enum CustomEffect {
  OTHER_MEMORY = 'OTHER_MEMORY',
  CARRYALL = 'CARRYALL',
  GUN_THOPTER = 'GUN_THOPTER',
  KWISATZ_HADERACH = 'KWISATZ_HADERACH',
  /** Kwisatz agent-source choice: place from supply (normal space effects). */
  KWISATZ_FROM_SUPPLY = 'KWISATZ_FROM_SUPPLY',
  /** Kwisatz agent-source choice: recall from board first (no destination space effects). */
  KWISATZ_RECALL_AGENT = 'KWISATZ_RECALL_AGENT',
  LIET_KYNES = 'LIET_KYNES',
  SECRETS_STEAL = 'SECRETS_STEAL',
  POWER_PLAY = 'POWER_PLAY', 
  REVEREND_MOTHER_MOHIAM = 'REVEREND_MOTHER_MOHIAM', 
  TEST_OF_HUMANITY = 'TEST_OF_HUMANITY',
  THE_VOICE = 'THE_VOICE',
  GUILD_BANKERS = 'GUILD_BANKERS',
  SHUFFLE_DISCARD_INTO_DECK = 'SHUFFLE_DISCARD_INTO_DECK',
  SIGNET_RING = 'SIGNET_RING',
  HELENA_SIGNET_RING = 'HELENA_SIGNET_RING',
  /** Plot intrigue: next Agent placement merges four faction icons (Emperor, Guild, BG, Fremen) with the played card */
  DISPATCH_ENVOY = 'DISPATCH_ENVOY',
  /** Plot intrigue Infiltrate: ignore enemy occupancy once */
  INFILTRATE_INTRIGUE = 'INFILTRATE_INTRIGUE',
  /** Plot intrigue Double Cross: resolved in PLAY_INTRIGUE with targetPlayerId */
  DOUBLE_CROSS = 'DOUBLE_CROSS',
  /** Plot intrigue Rapid Mobilization: sets pending garrison mobilization */
  RAPID_MOBILIZATION = 'RAPID_MOBILIZATION',
  /** Plot intrigue Urgent Mission: no-op in apply; recall via pending choice */
  URGENT_MISSION = 'URGENT_MISSION',
  /** Endgame Corner the Market: VP from TSMF counts */
  CORNER_THE_MARKET = 'CORNER_THE_MARKET',
  /** Endgame Plans Within Plans: VP from influence thresholds */
  PLANS_WITHIN_PLANS = 'PLANS_WITHIN_PLANS',
  /** Combat Staged Incident: lose 3 conflict troops then +1 VP */
  STAGED_INCIDENT = 'STAGED_INCIDENT',
  /** Combat To the Victor: defer spice to conflict win */
  TO_THE_VICTOR = 'TO_THE_VICTOR',
  /** Plot Bindu Suspension: draw 1 to handCount then may end turn early (PLAY_INTRIGUE special-case) */
  BINDU_SUSPENSION = 'BINDU_SUSPENSION',
  /** Combat Master Tactician: marker for pending OR-choice UI (PLAY_COMBAT_INTRIGUE); choice lines use choiceOpt */
  MASTER_TACTICIAN = 'MASTER_TACTICIAN',
  // Rise of Ix — enum only; handlers wired in later tasks
  COMMISSION_DREADNOUGHT = 'COMMISSION_DREADNOUGHT',
  DREADNOUGHT_CONTROL = 'DREADNOUGHT_CONTROL',
  ACQUIRE_TECH = 'ACQUIRE_TECH',
  ACQUIRE_TECH_DISCOUNT_1 = 'ACQUIRE_TECH_DISCOUNT_1',
  ACQUIRE_TECH_DISCOUNT_2 = 'ACQUIRE_TECH_DISCOUNT_2',
  TECH_NEGOTIATOR = 'TECH_NEGOTIATOR',
  FREIGHTER_ADVANCE = 'FREIGHTER_ADVANCE',
  FREIGHTER_RECALL = 'FREIGHTER_RECALL',
  /** Tessia Vernius — optional discard after claiming 1st snooper reward slot. */
  TESSIA_SNOOPER_DISCARD_SPICE = 'TESSIA_SNOOPER_DISCARD_SPICE',
  /** Tessia Vernius — resolve discard from CARD_SELECT for snooper reward. */
  TESSIA_SNOOPER_DISCARD_RESOLVED = 'TESSIA_SNOOPER_DISCARD_RESOLVED',
  DIVIDENDS = 'DIVIDENDS',
  UNLOAD_REVEAL = 'UNLOAD_REVEAL',
  DISCARD_FROM_HAND = 'DISCARD_FROM_HAND',
  GLIMPSE_THE_PATH = 'GLIMPSE_THE_PATH',
  GRAND_CONSPIRACY = 'GRAND_CONSPIRACY',
  MACHINE_CULTURE = 'MACHINE_CULTURE',
  CULL = 'CULL',
  QUID_PRO_QUO = 'QUID_PRO_QUO',
  STRONGARM = 'STRONGARM',
  SECRET_FORCES = 'SECRET_FORCES',
  IXIAN_PROBE = 'IXIAN_PROBE',
  DIVERSION = 'DIVERSION',
  EXPEDITE = 'EXPEDITE',
  BLACKMAIL = 'BLACKMAIL',
  CANNON_TURRETS = 'CANNON_TURRETS',
  STRATEGIC_PUSH = 'STRATEGIC_PUSH',
  SECOND_WAVE = 'SECOND_WAVE',
  WAR_CHEST = 'WAR_CHEST',
  FINESSE = 'FINESSE',
  ADVANCED_WEAPONRY = 'ADVANCED_WEAPONRY',
  RHOMBUR_DREADNOUGHT_STRENGTH = 'RHOMBUR_DREADNOUGHT_STRENGTH',
  /** Rise of Ix imperium cards */
  BOUNTY_INFILTRATION_BONUS = 'BOUNTY_INFILTRATION_BONUS',
  DESERT_AMBUSH = 'DESERT_AMBUSH',
  FULLSCALE_DREAD_SWORDS = 'FULLSCALE_DREAD_SWORDS',
  GUILD_ACCORD_HEIGHTLINER_DISCOUNT = 'GUILD_ACCORD_HEIGHTLINER_DISCOUNT',
  IMPERIAL_BASHAR_SWORDS = 'IMPERIAL_BASHAR_SWORDS',
  SHOCKTROOPER_EM_BONUS = 'SHOCKTROOPER_EM_BONUS',
  IXIAN_ENGINEER_VP = 'IXIAN_ENGINEER_VP',
  NEGOTIATED_WITHDRAWAL = 'NEGOTIATED_WITHDRAWAL',
  TREACHERY_DOUBLE_INFLUENCE = 'TREACHERY_DOUBLE_INFLUENCE',
  WEB_OF_POWER = 'WEB_OF_POWER',
  WEIRDING_WAY_EXTRA_TURN = 'WEIRDING_WAY_EXTRA_TURN',
  YUNA_SOLARI_BONUS = 'YUNA_SOLARI_BONUS',
  ARMAND_TRASH_IN_PLAY = 'ARMAND_TRASH_IN_PLAY',
  ILESA_SET_ASIDE = 'ILESA_SET_ASIDE',
  TESSIA_SNOOPER = 'TESSIA_SNOOPER',
  ACQUIRE_FOLDSPACE = 'ACQUIRE_FOLDSPACE',
  /** Rise of Ix tech tiles — per-tile custom handlers in riseOfIxReducer. */
  ARTILLERY = 'ARTILLERY',
  CHAUMURKY = 'CHAUMURKY',
  DETONATION_DEVICES = 'DETONATION_DEVICES',
  DISPOSAL_FACILITY = 'DISPOSAL_FACILITY',
  FLAGSHIP = 'FLAGSHIP',
  HOLOPROJECTORS = 'HOLOPROJECTORS',
  HOLTZMAN_ENGINE = 'HOLTZMAN_ENGINE',
  INVASION_SHIPS = 'INVASION_SHIPS',
  MEMOCORDERS = 'MEMOCORDERS',
  RESTRICTED_ORDINANCE = 'RESTRICTED_ORDINANCE',
  SONIC_SNOOPERS = 'SONIC_SNOOPERS',
  SPACEPORT = 'SPACEPORT',
  SPY_SATELLITES = 'SPY_SATELLITES',
  TRAINING_DRONES = 'TRAINING_DRONES',
  TROOP_TRANSPORTS = 'TROOP_TRANSPORTS',
  WINDTRAPS = 'WINDTRAPS',
  /**
   * Immortality — graft and Tleilaxu specials. Most Immortality cards are
   * declarative (specimen / research / tleilaxu / influence rewards); the
   * members below back cards whose effects depend on grafting, the other
   * grafted card, or research level in ways the declarative shape can't express.
   * Handlers live in `expansions/immortality/reducer.ts`.
   */
  GHOLA_COPY = 'GHOLA_COPY',
  USURP_GRAFT = 'USURP_GRAFT',
  CHAIRDOG_RETURN = 'CHAIRDOG_RETURN',
  BEGUILING_PHEROMONES = 'BEGUILING_PHEROMONES',
  TWISTED_MENTAT_RECALL = 'TWISTED_MENTAT_RECALL',
  BLANK_SLATE_ICONS = 'BLANK_SLATE_ICONS',
  DISSECTING_KIT = 'DISSECTING_KIT',
  REPLACEMENT_EYES_TRASH_BEETLE = 'REPLACEMENT_EYES_TRASH_BEETLE',
  SLIG_FARMER = 'SLIG_FARMER',
  STITCHED_HORROR = 'STITCHED_HORROR',
  ORGAN_MERCHANTS = 'ORGAN_MERCHANTS',
  TLEILAXU_SURGEON = 'TLEILAXU_SURGEON',
  TLEILAXU_MASTER = 'TLEILAXU_MASTER',
  SHADOUT_MAPES = 'SHADOUT_MAPES',
  OCCUPATION_COMBAT = 'OCCUPATION_COMBAT',
  CLANDESTINE_MEETING = 'CLANDESTINE_MEETING',
  IMPERIUM_CEREMONY = 'IMPERIUM_CEREMONY',
  SCIENTIFIC_BREAKTHROUGH = 'SCIENTIFIC_BREAKTHROUGH',
  VICIOUS_TALENTS = 'VICIOUS_TALENTS',
  DISGUISED_BUREAUCRAT = 'DISGUISED_BUREAUCRAT',
  STUDY_MELANGE = 'STUDY_MELANGE',
  TLEILAXU_PUPPET = 'TLEILAXU_PUPPET',
  COUNTERATTACK = 'COUNTERATTACK',
  ECONOMIC_POSITIONING_IMM = 'ECONOMIC_POSITIONING_IMM',
  HARVEST_CELLS = 'HARVEST_CELLS',
  GRUESOME_SACRIFICE = 'GRUESOME_SACRIFICE',
  SHADOWY_BARGAIN = 'SHADOWY_BARGAIN',
  SHOW_OF_STRENGTH = 'SHOW_OF_STRENGTH',
  STILLSUIT_MANUFACTURER = 'STILLSUIT_MANUFACTURER',
  HIGH_PRIORITY_TRAVEL = 'HIGH_PRIORITY_TRAVEL',
  LISAN_AL_GAIB = 'LISAN_AL_GAIB',
  LONG_REACH = 'LONG_REACH',
  GUILD_IMPERSONATOR = 'GUILD_IMPERSONATOR',
  RECLAIMED_FORCES = 'RECLAIMED_FORCES',
  FAMILY_ATOMICS = 'FAMILY_ATOMICS',
}

// Custom effects that are auto-applied and don't need user input
export const AUTO_APPLIED_CUSTOM_EFFECTS: CustomEffect[] = [
  CustomEffect.KWISATZ_HADERACH,
  CustomEffect.LIET_KYNES,
  CustomEffect.SHUFFLE_DISCARD_INTO_DECK,
]