import {
  TECH_TILES,
  TechTileId,
  TechTileTiming,
  type PlayerTechTile,
  getTechTile,
} from '../../data/techTiles'
import {
  AgentIcon,
  CardPile,
  ChoiceType,
  CustomEffect,
  FactionType,
  GainSource,
  RewardType,
  type CardSelectChoice,
  type Card,
  type Gain,
  type GameState,
  type PendingReward,
  type Player,
  type Reward,
} from '../../types/GameTypes'
import { countSpiceMustFlowCards } from '../../utils/spiceMustFlow'
import { getDreadnoughtsInConflict } from '../../utils/dreadnoughts'
import { createGainInfluenceChoice } from '../../utils/influenceChoices'
import { nextSemanticId } from '../../utils/semanticIds'
import { effectiveTechCost, playerOwnsTile, tileById, tilesActivatableNow } from '../../utils/techTiles'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { updateFactionInfluence } from '../../utils/influenceVictoryPoints'
import { playerHasUnitsInCombat } from '../../utils/dreadnoughts'
import {
  placeNegotiatorsFromSupply,
  recruitTroopsToGarrison,
  returnNegotiatorsToSupply,
} from '../../utils/troops'
import { isCardInHand, validateDiscardCostSelection } from '../../utils/playAreaDisplay'

export type AcquireTechAction = {
  type: 'ACQUIRE_TECH'
  playerId: number
  tileId: TechTileId
  stackIndex: number
  negotiatorsReturned: number
  discount: number
  paySolariInsteadOfSpice?: boolean
  /** Which face-down tile in this stack becomes the new face-up top (required when >1 remain). */
  nextFaceUpTileId?: TechTileId
}

export type TechNegotiatorAction = {
  type: 'TECH_NEGOTIATOR'
  playerId: number
  amount: number
}

export type ActivateTechAction = {
  type: 'ACTIVATE_TECH'
  playerId: number
  tileId: TechTileId
}

function shuffleInPlace<T>(arr: T[], random = Math.random): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/** Shuffle 18 tile ids into 3 stacks of 6; index 0 of each stack is face-up. */
export function buildInitialIxBoard(random = Math.random): NonNullable<GameState['ixBoard']> {
  const ids = TECH_TILES.map(t => t.id)
  shuffleInPlace(ids, random)
  return buildIxBoardFromFaceUpTiles(
    [ids[0], ids[6], ids[12]] as [TechTileId, TechTileId, TechTileId],
    ids.filter(id => id !== ids[0] && id !== ids[6] && id !== ids[12]),
    random
  )
}

/** Build three stacks from chosen face-up tiles; remaining tiles shuffle into face-down rows. */
export function buildIxBoardFromFaceUpTiles(
  faceUpIds: [TechTileId, TechTileId, TechTileId],
  remainingIds?: TechTileId[],
  random = Math.random
): NonNullable<GameState['ixBoard']> {
  const unique = new Set(faceUpIds)
  if (unique.size !== 3) {
    throw new Error('buildIxBoardFromFaceUpTiles requires three distinct tile ids')
  }

  const pool =
    remainingIds ??
    TECH_TILES.map(t => t.id).filter(id => !unique.has(id))
  if (pool.length !== 15) {
    throw new Error('buildIxBoardFromFaceUpTiles requires 15 remaining tiles')
  }

  const shuffled = [...pool]
  shuffleInPlace(shuffled, random)

  return {
    stacks: faceUpIds.map((top, stackIndex) => [
      top,
      ...shuffled.slice(stackIndex * 5, stackIndex * 5 + 5),
    ]),
    nextFaceUpRevealed: {},
  }
}

/** Build sandbox Ix stacks; `null` entries are intentionally empty stacks. */
export function buildIxBoardFromSandboxStackTops(
  stackTops: Array<TechTileId | null>,
  excludedIds: TechTileId[],
  random = Math.random
): NonNullable<GameState['ixBoard']> {
  const stackSize = 6
  if (stackTops.length !== 3) {
    throw new Error('buildIxBoardFromSandboxStackTops requires three stack tops')
  }

  const faceUpIds = stackTops.filter((top): top is TechTileId => top != null)
  const unique = new Set(faceUpIds)
  if (unique.size !== faceUpIds.length) {
    throw new Error('buildIxBoardFromSandboxStackTops requires distinct face-up tile ids')
  }

  const excluded = new Set(excludedIds)
  for (const id of faceUpIds) {
    if (excluded.has(id)) {
      throw new Error('buildIxBoardFromSandboxStackTops cannot use player-owned tile ids')
    }
  }

  if (faceUpIds.length === 0) {
    return { stacks: [[], [], []], nextFaceUpRevealed: {} }
  }

  const pool = TECH_TILES.map(tile => tile.id).filter(id => !excluded.has(id) && !unique.has(id))
  const tilesNeededFaceDown = faceUpIds.length * (stackSize - 1)
  if (pool.length < tilesNeededFaceDown) {
    throw new Error('buildIxBoardFromSandboxStackTops does not have enough remaining tiles')
  }

  const shuffled = [...pool]
  shuffleInPlace(shuffled, random)

  let poolIndex = 0
  const stacks = stackTops.map(top => {
    if (top == null) return []
    const faceDown = shuffled.slice(poolIndex, poolIndex + stackSize - 1)
    poolIndex += stackSize - 1
    return [top, ...faceDown]
  })

  return { stacks, nextFaceUpRevealed: {} }
}

function techGainSource(tileId: TechTileId): { type: GainSource; id: number; name: string } {
  const tile = getTechTile(tileId)
  return {
    type: GainSource.IX_BOARD,
    id: 0,
    name: tile?.name ?? tileId,
  }
}

function pushGain(
  gains: Gain[],
  state: GameState,
  playerId: number,
  source: { type: GainSource; id: number; name: string },
  amount: number,
  type: RewardType
): void {
  gains.push({
    round: state.currentRound,
    playerId,
    sourceId: source.id,
    name: source.name,
    amount,
    type,
    source: source.type,
  })
}

function updatePlayer(
  state: GameState,
  playerId: number,
  updater: (player: Player) => Player
): GameState {
  return {
    ...state,
    players: state.players.map(p => (p.id === playerId ? updater(p) : p)),
  }
}

function addPendingReward(
  state: GameState,
  reward: Reward,
  source: { type: GainSource; id: number; name: string },
  isTrash = false
): GameState {
  const rewardId = nextSemanticId(source, 'REWARD', state.pendingRewards.map(r => r.id))
  const pendingReward: PendingReward = { id: rewardId, source, reward, isTrash }
  return { ...state, pendingRewards: [...state.pendingRewards, pendingReward] }
}

/** Apply declarative acquireEffect and enqueue choices (influence, trash). */
export function applyTechTileAcquireEffect(
  state: GameState,
  playerId: number,
  tileId: TechTileId
): GameState {
  const tile = getTechTile(tileId)
  if (!tile?.acquireEffect) return state

  const source = techGainSource(tileId)
  const effect = tile.acquireEffect
  let next: GameState = { ...state, gains: [...state.gains] }
  const player = next.players.find(p => p.id === playerId)
  if (!player) return state

  if (effect.spice) {
    next = updatePlayer(next, playerId, p => ({ ...p, spice: p.spice + effect.spice! }))
    pushGain(next.gains, next, playerId, source, effect.spice, RewardType.SPICE)
  }
  if (effect.water) {
    next = updatePlayer(next, playerId, p => ({ ...p, water: p.water + effect.water! }))
    pushGain(next.gains, next, playerId, source, effect.water, RewardType.WATER)
  }
  if (effect.solari) {
    next = updatePlayer(next, playerId, p => ({ ...p, solari: p.solari + effect.solari! }))
    pushGain(next.gains, next, playerId, source, effect.solari, RewardType.SOLARI)
  }
  if (effect.troops) {
    next = updatePlayer(next, playerId, p => recruitTroopsToGarrison(p, effect.troops!).player)
    pushGain(next.gains, next, playerId, source, effect.troops, RewardType.TROOPS)
  }
  if (effect.drawCards) {
    next = updatePlayer(next, playerId, p => ({ ...p, handCount: p.handCount + effect.drawCards! }))
    pushGain(next.gains, next, playerId, source, effect.drawCards, RewardType.DRAW)
  }
  if (effect.victoryPoints) {
    next = updatePlayer(next, playerId, p => ({
      ...p,
      victoryPoints: p.victoryPoints + effect.victoryPoints!,
    }))
    pushGain(next.gains, next, playerId, source, effect.victoryPoints, RewardType.VICTORY_POINTS)
  }
  if (effect.intrigueCards) {
    next = updatePlayer(next, playerId, p => ({
      ...p,
      intrigueCount: p.intrigueCount + effect.intrigueCards!,
    }))
    pushGain(next.gains, next, playerId, source, effect.intrigueCards, RewardType.INTRIGUE)
  }
  if (effect.trash) {
    next = addPendingReward(next, { trash: effect.trash }, source, true)
  }
  if (effect.influence?.chooseOne) {
    const choice = createGainInfluenceChoice(
      effect.influence,
      source,
      'Choose a faction for tech tile influence',
      []
    )
    const currTurn = next.currTurn
    if (currTurn?.playerId === playerId) {
      next = {
        ...next,
        currTurn: {
          ...currTurn,
          pendingChoices: [...(currTurn.pendingChoices ?? []), choice],
        },
        canEndTurn: false,
      }
    } else {
      next = addPendingReward(next, { influence: effect.influence }, source)
    }
  }

  if (tileId === TechTileId.SHUTTLE_FLEET && effect.influence?.chooseOne) {
    const second = createGainInfluenceChoice(
      effect.influence,
      source,
      'Choose a second faction for Shuttle Fleet influence',
      []
    )
    const currTurn = next.currTurn
    if (currTurn?.playerId === playerId) {
      next = {
        ...next,
        currTurn: {
          ...currTurn,
          pendingChoices: [...(currTurn.pendingChoices ?? []), second],
        },
      }
    }
  }

  return next
}

export function handleAcquireTech(state: GameState, action: AcquireTechAction): GameState {
  if (!state.expansions.riseOfIx) return state
  const { playerId, tileId, stackIndex, negotiatorsReturned, discount } = action

  const player = state.players.find(p => p.id === playerId)
  const tile = getTechTile(tileId)
  const ixBoard = state.ixBoard
  if (!player || !tile || !ixBoard) return state

  const stack = ixBoard.stacks[stackIndex]
  if (!stack?.length || stack[0] !== tileId) return state
  if (negotiatorsReturned < 0 || negotiatorsReturned > (player.negotiatorsOnIx ?? 0)) return state

  const pendingDiscount =
    state.pendingAcquireTech?.playerId === playerId ? state.pendingAcquireTech.discount : 0
  const paySolariInsteadOfSpice =
    action.paySolariInsteadOfSpice ??
    (state.pendingAcquireTech?.playerId === playerId
      ? state.pendingAcquireTech.paySolariInsteadOfSpice
      : false)
  const cost = effectiveTechCost(tile.cost, discount + pendingDiscount, negotiatorsReturned)
  if (paySolariInsteadOfSpice) {
    if (player.solari < cost) return state
  } else if (player.spice < cost) {
    return state
  }

  const gains: Gain[] = [
    ...state.gains,
    {
      round: state.currentRound,
      playerId,
      sourceId: 0,
      name: tile.name,
      amount: 1,
      type: RewardType.TECH,
      source: GainSource.IX_BOARD,
    },
  ]
  if (cost > 0) {
    gains.push({
      round: state.currentRound,
      playerId,
      sourceId: 0,
      name: tile.name,
      amount: -cost,
      type: paySolariInsteadOfSpice ? RewardType.SOLARI : RewardType.SPICE,
      source: GainSource.IX_BOARD,
    })
  }
  if (negotiatorsReturned > 0) {
    gains.push({
      round: state.currentRound,
      playerId,
      sourceId: 0,
      name: 'Negotiators returned',
      amount: negotiatorsReturned,
      type: RewardType.TROOPS,
      source: GainSource.IX_BOARD,
    })
    gains.push({
      round: state.currentRound,
      playerId,
      sourceId: 0,
      name: 'Negotiators returned',
      amount: -negotiatorsReturned,
      type: RewardType.NEGOTIATOR,
      source: GainSource.IX_BOARD,
    })
  }

  const ownedTile: PlayerTechTile = { id: tileId, faceUp: true }
  const faceDownRemainder = stack.slice(1)
  let newStackForIndex: TechTileId[] = []
  if (faceDownRemainder.length === 1) {
    newStackForIndex = [faceDownRemainder[0]!]
  } else if (faceDownRemainder.length > 1) {
    const nextFaceUpTileId = action.nextFaceUpTileId
    if (!nextFaceUpTileId || !faceDownRemainder.includes(nextFaceUpTileId)) return state
    newStackForIndex = [
      nextFaceUpTileId,
      ...faceDownRemainder.filter(id => id !== nextFaceUpTileId),
    ]
  }
  const newStacks = ixBoard.stacks.map((s, i) => (i === stackIndex ? newStackForIndex : [...s]))
  const nextFaceUpRevealed = { ...ixBoard.nextFaceUpRevealed }
  if (newStackForIndex.length > 0) {
    nextFaceUpRevealed[stackIndex] = true
  } else {
    delete nextFaceUpRevealed[stackIndex]
  }

  let next: GameState = {
    ...state,
    gains,
    ixBoard: { ...ixBoard, stacks: newStacks, nextFaceUpRevealed },
    pendingAcquireTech: null,
    players: state.players.map(p => {
      if (p.id !== playerId) return p
      const returned = returnNegotiatorsToSupply(p, negotiatorsReturned)
      return {
        ...returned,
        spice: paySolariInsteadOfSpice ? p.spice : p.spice - cost,
        solari: paySolariInsteadOfSpice ? p.solari - cost : p.solari,
        tech: [...(p.tech ?? []), ownedTile],
      }
    }),
  }

  next = applyTechTileAcquireEffect(next, playerId, tileId)
  next = syncSpaceportAcquireToTop(next)
  return next
}

export function handleTechNegotiator(state: GameState, action: TechNegotiatorAction): GameState {
  if (!state.expansions.riseOfIx) return state
  const { playerId, amount } = action
  if (amount <= 0) return state
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const { player: updated, placed } = placeNegotiatorsFromSupply(player, amount)
  if (placed <= 0) return state

  const gains: Gain[] = [
    ...state.gains,
    {
      round: state.currentRound,
      playerId,
      sourceId: 0,
      name: 'Tech Negotiator',
      amount: placed,
      type: RewardType.NEGOTIATOR,
      source: GainSource.BOARD_SPACE,
    },
    {
      round: state.currentRound,
      playerId,
      sourceId: 0,
      name: 'Tech Negotiator',
      amount: -placed,
      type: RewardType.POOL_TROOP,
      source: GainSource.BOARD_SPACE,
    },
  ]

  return {
    ...state,
    gains,
    players: state.players.map(p => (p.id === playerId ? updated : p)),
  }
}

export function applyTechNegotiatorReward(
  state: GameState,
  playerId: number,
  amount: number
): GameState {
  if (!state.expansions.riseOfIx || amount <= 0) return state
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state
  const { placed } = placeNegotiatorsFromSupply(player, amount)
  if (placed <= 0) return state
  return handleTechNegotiator(state, { type: 'TECH_NEGOTIATOR', playerId, amount: placed })
}

export function setPendingAcquireTech(
  state: GameState,
  playerId: number,
  discount: number
): GameState {
  return { ...state, pendingAcquireTech: { playerId, discount } }
}

export function applyRoundStartTech(state: GameState): GameState {
  if (!state.expansions.riseOfIx) return state

  let next: GameState = {
    ...state,
    players: state.players.map(p => ({
      ...p,
      tech: (p.tech ?? []).map(t => ({ ...t, faceUp: true })),
      activatedTechThisRound: [],
    })),
  }

  for (const p of next.players) {
    for (const { id } of p.tech ?? []) {
      if (id === TechTileId.HOLTZMAN_ENGINE) {
        next = applyHoltzmanRoundStart(next, p.id)
      } else if (id === TechTileId.SHUTTLE_FLEET) {
        next = applyShuttleFleetRoundStart(next, p.id)
      }
    }
  }

  return syncSpaceportAcquireToTop(next)
}

function applyHoltzmanRoundStart(state: GameState, playerId: number): GameState {
  const source = { type: GainSource.TECH, id: 0, name: 'Holtzman Engine' }
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, 1, RewardType.DRAW)
  return updatePlayer(
    { ...state, gains },
    playerId,
    p => ({ ...p, handCount: p.handCount + 1 })
  )
}

function applyShuttleFleetRoundStart(state: GameState, playerId: number): GameState {
  const source = { type: GainSource.TECH, id: 0, name: 'Shuttle Fleet' }
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, 2, RewardType.SOLARI)
  return updatePlayer(
    { ...state, gains },
    playerId,
    p => ({ ...p, solari: p.solari + 2 })
  )
}

export function syncSpaceportAcquireToTop(state: GameState): GameState {
  if (!state.expansions.riseOfIx) return state
  const flags = { ...(state.acquireToTopThisRound ?? {}) }
  state.players.forEach(p => {
    if (playerOwnsTile(p, TechTileId.SPACEPORT)) {
      flags[p.id] = true
    }
  })
  return { ...state, acquireToTopThisRound: flags }
}

function cardProvidesSword(card: Card): boolean {
  return (card.revealEffect ?? []).some(e => (e.reward?.combat ?? 0) > 0)
}

export function applyRevealTechEffects(
  state: GameState,
  playerId: number,
  revealedCards: Card[],
  persuasionCount: number,
  swordCount: number
): {
  state: GameState
  persuasionCount: number
  swordCount: number
} {
  if (!state.expansions.riseOfIx) {
    return { state, persuasionCount, swordCount }
  }

  const player = state.players.find(p => p.id === playerId)
  if (!player) return { state, persuasionCount, swordCount }

  let next = state
  let persuasion = persuasionCount
  let swords = swordCount

  for (const { id } of player.tech ?? []) {
    const tile = tileById(id)
    if (!tile?.timing.includes(TechTileTiming.REVEAL)) continue

    const source = { type: GainSource.TECH, id: 0, name: tile.name }

    if (id === TechTileId.MINIMIC_FILM) {
      persuasion += 1
      next = {
        ...next,
        gains: [
          ...next.gains,
          {
            round: next.currentRound,
            playerId,
            sourceId: 0,
            name: tile.name,
            amount: 1,
            type: RewardType.PERSUASION,
            source: GainSource.TECH,
          },
        ],
      }
    }

    if (id === TechTileId.ARTILLERY) {
      const swordCards = revealedCards.filter(cardProvidesSword).length
      if (swordCards > 0 && (next.combatTroops[playerId] ?? 0) > 0) {
        swords += swordCards
        const gains = [...next.gains]
        pushGain(gains, next, playerId, source, swordCards, RewardType.COMBAT)
        next = {
          ...next,
          gains,
          combatStrength: {
            ...next.combatStrength,
            [playerId]: (next.combatStrength[playerId] ?? 0) + swordCards,
          },
        }
      }
    }

    if (id === TechTileId.RESTRICTED_ORDINANCE && player.hasHighCouncilSeat) {
      if ((next.combatTroops[playerId] ?? 0) > 0) {
        swords += 4
        const gains = [...next.gains]
        pushGain(gains, next, playerId, source, 4, RewardType.COMBAT)
        next = {
          ...next,
          gains,
          combatStrength: {
            ...next.combatStrength,
            [playerId]: (next.combatStrength[playerId] ?? 0) + 4,
          },
        }
      }
    }

    if (id === TechTileId.DISPOSAL_FACILITY && persuasion >= 6) {
      next = addPendingReward(next, { trash: 1 }, source, true)
    }
  }

  return { state: next, persuasionCount: persuasion, swordCount: swords }
}

export function applyAfterConflictTechEffects(
  state: GameState,
  winnerIds: number[]
): GameState {
  if (!state.expansions.riseOfIx || winnerIds.length === 0) return state

  let next = state
  for (const winnerId of winnerIds) {
    const player = next.players.find(p => p.id === winnerId)
    if (!player) continue

    if (playerOwnsTile(player, TechTileId.WINDTRAPS)) {
      const source = { type: GainSource.TECH, id: 0, name: 'Windtraps' }
      const gains = [...next.gains]
      pushGain(gains, next, winnerId, source, 1, RewardType.WATER)
      next = updatePlayer({ ...next, gains }, winnerId, p => ({ ...p, water: p.water + 1 }))
    }

    if (
      playerOwnsTile(player, TechTileId.DETONATION_DEVICES) &&
      getDreadnoughtsInConflict(player) > 0
    ) {
      const choiceId = nextSemanticId(
        { type: GainSource.TECH, id: 0, name: 'Detonation Devices' },
        'DETONATION',
        (next.pendingConflictRewardChoices ?? []).map(c => c.id)
      )
      next = {
        ...next,
        pendingConflictRewardChoices: [
          ...(next.pendingConflictRewardChoices ?? []),
          {
            id: choiceId,
            playerId: winnerId,
            placement: 'Detonation Devices',
            conflictId: next.currentConflict.id,
            conflictName: next.currentConflict.name,
            options: [
              {
                label: '+1 VP and return dreadnought to supply',
                reward: { victoryPoints: 1, custom: CustomEffect.DETONATION_DEVICES },
              },
              {
                label: 'Take control space normally',
                reward: {},
              },
            ],
          },
        ],
      }
    }
  }
  return next
}

export function applyEndgameTechScoring(state: GameState): GameState {
  if (!state.expansions.riseOfIx) return state

  let next = state
  const chaumurkyOwners = new Set<number>()
  const tiebreakerSpice = { ...(next.endgameTiebreakerSpice ?? {}) }

  next.players.forEach(player => {
    ;(player.tech ?? []).forEach(({ id }) => {
      if (id === TechTileId.CHAUMURKY) chaumurkyOwners.add(player.id)
    })
  })

  const gains = [...next.gains]
  const players = next.players.map(p => {
    let vp = p.victoryPoints

    if (playerOwnsTile(p, TechTileId.HOLTZMAN_ENGINE) && countSpiceMustFlowCards(p) >= 2) {
      vp += 1
      pushGain(gains, next, p.id, { type: GainSource.TECH, id: 0, name: 'Holtzman Engine' }, 1, RewardType.VICTORY_POINTS)
    }

    if (playerOwnsTile(p, TechTileId.MEMOCORDERS)) {
      const factions = [
        FactionType.EMPEROR,
        FactionType.SPACING_GUILD,
        FactionType.BENE_GESSERIT,
        FactionType.FREMEN,
      ]
      if (factions.every(f => (next.factionInfluence[f]?.[p.id] ?? 0) >= 3)) {
        vp += 1
        pushGain(gains, next, p.id, { type: GainSource.TECH, id: 0, name: 'Memocorders' }, 1, RewardType.VICTORY_POINTS)
      }
    }

    if (playerOwnsTile(p, TechTileId.SPY_SATELLITES)) {
      const factions = [
        FactionType.EMPEROR,
        FactionType.SPACING_GUILD,
        FactionType.BENE_GESSERIT,
        FactionType.FREMEN,
      ]
      const lowInfluence = factions.filter(f => (next.factionInfluence[f]?.[p.id] ?? 0) <= 1).length
      if (lowInfluence > 0) {
        vp += lowInfluence
        pushGain(
          gains,
          next,
          p.id,
          { type: GainSource.TECH, id: 0, name: 'Spy Satellites' },
          lowInfluence,
          RewardType.VICTORY_POINTS
        )
      }
    }

    return vp !== p.victoryPoints ? { ...p, victoryPoints: vp } : p
  })

  if (chaumurkyOwners.size > 0) {
    chaumurkyOwners.forEach(id => {
      tiebreakerSpice[id] = (tiebreakerSpice[id] ?? 0) + 10_000
    })
  }

  return { ...next, players, gains, endgameTiebreakerSpice: tiebreakerSpice }
}

export function applyTroopTransportsToFreighterReward(
  state: GameState,
  playerId: number,
  baseTroops: number
): Reward {
  const player = state.players.find(p => p.id === playerId)
  if (!player || !playerOwnsTile(player, TechTileId.TROOP_TRANSPORTS)) {
    return { troops: baseTroops }
  }
  return { troops: baseTroops + 1, deployTroops: baseTroops + 1 }
}

export function claimAcquireTechReward(
  state: GameState,
  playerId: number,
  discount: number,
  paySolariInsteadOfSpice = false
): GameState {
  return {
    ...state,
    pendingAcquireTech: { playerId, discount, paySolariInsteadOfSpice },
  }
}

const EMPEROR_SPACE_IDS = new Set(
  BOARD_SPACES.filter(
    s => s.agentIcon === AgentIcon.EMPEROR || s.influence?.faction === FactionType.EMPEROR
  ).map(s => s.id)
)

function cardGainSource(cardId: number, cardName: string): {
  type: GainSource
  id: number
  name: string
} {
  return { type: GainSource.CARD, id: cardId, name: cardName }
}

export function applyBountyInfiltrationBonus(
  state: GameState,
  playerId: number,
  source: { type: GainSource; id: number; name: string }
): GameState {
  const usedInfiltrate = Boolean(state.infiltrateIgnoreOccupancyOnce?.[playerId])
  const spaceId = state.currTurn?.agentSpaceId
  if (!usedInfiltrate || spaceId == null) return state
  const occupants = state.occupiedSpaces[spaceId] ?? []
  const opponentOccupied = occupants.some(id => id !== playerId)
  if (!opponentOccupied) return state

  const gains = [
    ...state.gains,
    {
      round: state.currentRound,
      playerId,
      sourceId: source.id,
      name: source.name,
      amount: 2,
      type: RewardType.SOLARI,
      source: source.type,
    },
  ]
  return updatePlayer({ ...state, gains }, playerId, p => ({ ...p, solari: p.solari + 2 }))
}

/** Guild Accord: Heighliner costs 2 spice less this turn. */
export function applyGuildAccordDiscount(state: GameState, playerId: number): GameState {
  return {
    ...state,
    heighlinerDiscountThisTurn: {
      ...(state.heighlinerDiscountThisTurn ?? {}),
      [playerId]: 2,
    },
  }
}

export function heighlinerDiscountForPlayer(state: GameState, playerId: number): number {
  return state.heighlinerDiscountThisTurn?.[playerId] ?? 0
}

/** Web of Power agent box: per-faction 2× influence rewards. */
export function applyWebOfPower(state: GameState, playerId: number, cardId: number, cardName: string): GameState {
  const have2 = (f: FactionType) => (state.factionInfluence[f]?.[playerId] ?? 0) >= 2
  const source = cardGainSource(cardId, cardName)
  let next = { ...state, gains: [...state.gains] }

  if (have2(FactionType.EMPEROR)) {
    next = updatePlayer(next, playerId, p => ({ ...p, solari: p.solari + 2 }))
    pushGain(next.gains, next, playerId, source, 2, RewardType.SOLARI)
  }
  if (have2(FactionType.SPACING_GUILD)) {
    next = updatePlayer(next, playerId, p => ({ ...p, handCount: p.handCount + 1 }))
    pushGain(next.gains, next, playerId, source, 1, RewardType.DRAW)
  }
  if (have2(FactionType.FREMEN)) {
    next = updatePlayer(next, playerId, p => ({ ...p, water: p.water + 1 }))
    pushGain(next.gains, next, playerId, source, 1, RewardType.WATER)
  }
  return next
}

/** Weirding Way: allow one extra turn before rotation. */
export function applyWeirdingWayExtraTurn(
  state: GameState,
  playerId: number,
  cardId: number,
  cardName: string,
  /** When set (e.g. PLACE_AGENT), append the history gain here — that path commits this array, not `state.gains`. */
  gainsOut?: Gain[]
): GameState {
  if (!state.currTurn) return state
  const source = cardGainSource(cardId, cardName)
  if (gainsOut) {
    pushGain(gainsOut, state, playerId, source, 1, RewardType.EXTRA_TURN)
  } else {
    const gains = [...state.gains]
    pushGain(gains, state, playerId, source, 1, RewardType.EXTRA_TURN)
    state = { ...state, gains }
  }
  return {
    ...state,
    currTurn: { ...state.currTurn, extraTurnAllowed: true },
  }
}

/** Imperial Bashar reveal: +2 combat + 1 per other revealed sword card. */
export function applyImperialBasharSwords(
  state: GameState,
  playerId: number,
  cardId: number,
  cardName: string,
  revealedCards: Card[]
): GameState {
  if (!playerHasUnitsInCombat(state, playerId)) return state
  const swordCards = revealedCards.filter(c => c.id !== cardId && cardProvidesSword(c)).length
  const bonus = 2 + swordCards
  const source = cardGainSource(cardId, cardName)
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, bonus, RewardType.COMBAT)
  return {
    ...state,
    gains,
    combatStrength: {
      ...state.combatStrength,
      [playerId]: (state.combatStrength[playerId] ?? 0) + bonus,
    },
  }
}

/** Imperial Shock Trooper: +2 combat, or +5 if agent on Emperor space. */
export function applyShockTrooperBonus(
  state: GameState,
  playerId: number,
  cardId: number,
  cardName: string
): GameState {
  if (!playerHasUnitsInCombat(state, playerId)) return state
  const onEmSpace = Object.entries(state.occupiedSpaces).some(
    ([sid, occ]) => occ.includes(playerId) && EMPEROR_SPACE_IDS.has(Number(sid))
  )
  const bonus = onEmSpace ? 5 : 2
  const source = cardGainSource(cardId, cardName)
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, bonus, RewardType.COMBAT)
  return {
    ...state,
    gains,
    combatStrength: {
      ...state.combatStrength,
      [playerId]: (state.combatStrength[playerId] ?? 0) + bonus,
    },
  }
}

/** Full-Scale Assault: +3 combat per dreadnought in conflict. */
export function applyFullScaleDreadSwords(
  state: GameState,
  playerId: number,
  cardId: number,
  cardName: string
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player || !playerHasUnitsInCombat(state, playerId)) return state
  const dCount = getDreadnoughtsInConflict(player)
  if (dCount <= 0) return state
  const bonus = dCount * 3
  const source = cardGainSource(cardId, cardName)
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, bonus, RewardType.COMBAT)
  return {
    ...state,
    gains,
    combatStrength: {
      ...state.combatStrength,
      [playerId]: (state.combatStrength[playerId] ?? 0) + bonus,
    },
  }
}

/** Ixian Engineer: optional trash-for-VP when player owns 3+ tech. */
export function applyIxianEngineerVp(
  state: GameState,
  playerId: number,
  cardId: number,
  cardName: string
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player || (player.tech?.length ?? 0) < 3) return state
  const source = cardGainSource(cardId, cardName)
  return addPendingReward(state, { trashThisCard: true, victoryPoints: 1 }, source, true)
}

/** Negotiated Withdrawal: retreat 3 troops to gain influence (choice). */
export function applyNegotiatedWithdrawal(
  state: GameState,
  playerId: number,
  cardId: number,
  cardName: string
): GameState {
  const source = cardGainSource(cardId, cardName)
  let next = addPendingReward(
    state,
    {
      retreatTroops: 3,
      influence: {
        chooseOne: true as const,
        amounts: [
          { faction: FactionType.EMPEROR, amount: 1 },
          { faction: FactionType.SPACING_GUILD, amount: 1 },
          { faction: FactionType.BENE_GESSERIT, amount: 1 },
          { faction: FactionType.FREMEN, amount: 1 },
        ],
      },
    },
    source
  )
  if (next.currTurn?.playerId === playerId) {
    next = {
      ...next,
      currTurn: {
        ...next.currTurn,
        effectRetreatAllowance: (next.currTurn.effectRetreatAllowance ?? 0) + 3,
      },
    }
  }
  return next
}

/** Desert Ambush: enemy retreats per troop deployed this turn. */
export function applyDesertAmbush(
  state: GameState,
  playerId: number,
  cardId: number,
  cardName: string
): GameState {
  const deployed = state.currTurn?.troopsDeployedToConflict ?? 0
  if (deployed <= 0) return state
  const source = cardGainSource(cardId, cardName)
  const gains = [
    ...state.gains,
    {
      round: state.currentRound,
      playerId,
      sourceId: cardId,
      name: cardName,
      amount: deployed,
      type: RewardType.RETREAT,
      source: GainSource.CARD,
    },
  ]
  return {
    ...state,
    gains,
    currTurn: state.currTurn
      ? {
          ...state.currTurn,
          effectRetreatAllowance: (state.currTurn.effectRetreatAllowance ?? 0) + deployed,
        }
      : state.currTurn,
  }
}

/** Treachery play: double influence from this card's faction icons only. */
export function applyTreacheryDoubleInfluence(
  state: GameState,
  playerId: number,
  factions: FactionType[],
  cardId: number,
  cardName: string
): GameState {
  const source = cardGainSource(cardId, cardName)
  let next: GameState = { ...state, gains: [...state.gains] }
  for (const faction of factions) {
    next = updateFactionInfluence(next, faction, playerId, 2, { appendGainsTo: next.gains })
    pushGain(next.gains, next, playerId, source, 2, RewardType.INFLUENCE)
  }
  return next
}

export function markMandatoryDeploy(state: GameState): GameState {
  if (!state.currTurn) return state
  return {
    ...state,
    currTurn: { ...state.currTurn, mandatoryDeployTroops: true },
  }
}

export function consumeExtraTurn(state: GameState): GameState {
  return {
    ...state,
    currTurn: null,
    canEndTurn: false,
    heighlinerDiscountThisTurn: {},
  }
}

export function shouldConsumeExtraTurn(state: GameState): boolean {
  return Boolean(state.currTurn?.extraTurnAllowed)
}

function techActivationSource(tileId: TechTileId): { type: GainSource; id: number; name: string } {
  const tile = getTechTile(tileId)
  return { type: GainSource.TECH, id: 0, name: tile?.name ?? tileId }
}

function markTileActivated(
  state: GameState,
  playerId: number,
  tileId: TechTileId,
  opts: { remove?: boolean } = {}
): GameState {
  return updatePlayer(state, playerId, p => {
    if (opts.remove) {
      return {
        ...p,
        tech: (p.tech ?? []).filter(t => t.id !== tileId),
      }
    }
    return {
      ...p,
      tech: (p.tech ?? []).map(t => (t.id === tileId ? { ...t, faceUp: false } : t)),
      activatedTechThisRound: [...(p.activatedTechThisRound ?? []), tileId],
    }
  })
}

function enqueueDiscardChoice(
  state: GameState,
  playerId: number,
  tileId: TechTileId,
  prompt: string,
  customEffect: CustomEffect
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const source = techActivationSource(tileId)
  const choiceId = nextSemanticId(
    source,
    'TECH-DISCARD',
    (state.currTurn?.pendingChoices ?? []).map(c => c.id)
  )
  const choice: CardSelectChoice = {
    id: choiceId,
    type: ChoiceType.CARD_SELECT,
    prompt,
    piles: [CardPile.HAND],
    selectionCount: 1,
    discardCost: 1,
    filter: c => isCardInHand(player, c.id),
    onResolve: (cardIds: number[]) => ({
      type: 'CUSTOM_EFFECT',
      playerId,
      customEffect,
      data: { cardIds, tileId },
    }),
    source,
  }
  const currTurn = state.currTurn
  if (!currTurn) return state
  return {
    ...state,
    canEndTurn: false,
    currTurn: {
      ...currTurn,
      pendingChoices: [...(currTurn.pendingChoices ?? []), choice],
    },
  }
}

function applyFlagshipActivation(
  state: GameState,
  playerId: number,
  source: { type: GainSource; id: number; name: string }
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player || player.solari < 4) return state
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, -4, RewardType.SOLARI)
  pushGain(gains, state, playerId, source, 3, RewardType.TROOPS)
  return updatePlayer({ ...state, gains }, playerId, p => {
    const recruited = recruitTroopsToGarrison({ ...p, solari: p.solari - 4 }, 3)
    return recruited.player
  })
}

function applyTrainingDronesActivation(
  state: GameState,
  playerId: number,
  source: { type: GainSource; id: number; name: string }
): GameState {
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, 1, RewardType.TROOPS)
  return updatePlayer({ ...state, gains }, playerId, p => recruitTroopsToGarrison(p, 1).player)
}

function discardFromHand(
  state: GameState,
  playerId: number,
  cardId: number,
  source: { type: GainSource; id: number; name: string },
  drawCards: number
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state
  if (!validateDiscardCostSelection(player, 1, [cardId])) return state

  const deck = [...player.deck]
  const idx = deck.findIndex(c => c.id === cardId)
  if (idx === -1) return state

  const discardPile = [...player.discardPile]
  const [removed] = deck.splice(idx, 1)
  discardPile.push(removed)

  let handCount = player.handCount
  if (idx < handCount) {
    handCount = Math.max(0, handCount - 1)
  }
  const cardsInDrawPile = Math.max(0, deck.length - handCount)
  const drawn = Math.min(drawCards, cardsInDrawPile)
  handCount += drawn

  const gains = [...state.gains]
  gains.push({
    round: state.currentRound,
    playerId,
    sourceId: removed.id,
    name: source.name,
    amount: -1,
    type: RewardType.DISCARD,
    source: source.type,
  })
  if (drawn > 0) {
    pushGain(gains, state, playerId, source, drawn, RewardType.DRAW)
  }

  return updatePlayer({ ...state, gains }, playerId, p => ({
    ...p,
    deck,
    discardPile,
    handCount,
  }))
}

function enqueueIntrigueCardChoice(
  state: GameState,
  playerId: number,
  prompt: string,
  cards: GameState['intrigueDeck'],
  customEffect: CustomEffect,
  data: Record<string, unknown>
): GameState {
  const source = techActivationSource(TechTileId.SONIC_SNOOPERS)
  const choiceId = nextSemanticId(
    source,
    'SONIC-SNOOPERS',
    (state.currTurn?.pendingChoices ?? []).map(c => c.id)
  )
  const choice: CardSelectChoice = {
    id: choiceId,
    type: ChoiceType.CARD_SELECT,
    prompt,
    piles: [],
    cards: [...cards],
    selectionCount: 1,
    onResolve: (cardIds: number[]) => ({
      type: 'CUSTOM_EFFECT',
      playerId,
      customEffect,
      data: { ...data, cardId: cardIds[0] },
    }),
    source,
  }
  const currTurn = state.currTurn
  if (!currTurn) return state
  return {
    ...state,
    canEndTurn: false,
    currTurn: {
      ...currTurn,
      pendingChoices: [...(currTurn.pendingChoices ?? []), choice],
    },
  }
}

export function applySonicSnoopersDraw(
  state: GameState,
  playerId: number,
  cardId: number
): GameState {
  const card = state.intrigueDeck.find(c => c.id === cardId)
  if (!card) return state
  const source = techActivationSource(TechTileId.SONIC_SNOOPERS)
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, 1, RewardType.INTRIGUE)
  const next: GameState = {
    ...state,
    gains,
    intrigueDeck: state.intrigueDeck.filter(c => c.id !== cardId),
    players: state.players.map(p =>
      p.id === playerId ? { ...p, intrigueCount: p.intrigueCount + 1 } : p
    ),
  }
  if (next.intrigueDiscard.length > 0) {
    return enqueueIntrigueCardChoice(
      next,
      playerId,
      'Sonic Snoopers: choose an intrigue card to return to the deck',
      next.intrigueDiscard,
      CustomEffect.SONIC_SNOOPERS,
      { step: 'return' }
    )
  }
  return next
}

export function applySonicSnoopersReturn(
  state: GameState,
  playerId: number,
  cardId: number
): GameState {
  const card = state.intrigueDiscard.find(c => c.id === cardId)
  if (!card) return state
  const source = techActivationSource(TechTileId.SONIC_SNOOPERS)
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, -1, RewardType.INTRIGUE)
  return {
    ...state,
    gains,
    intrigueDiscard: state.intrigueDiscard.filter(c => c.id !== cardId),
    intrigueDeck: [...state.intrigueDeck, card],
    players: state.players.map(p =>
      p.id === playerId ? { ...p, intrigueCount: Math.max(0, p.intrigueCount - 1) } : p
    ),
  }
}

function applySpySatellitesActivation(
  state: GameState,
  playerId: number,
  source: { type: GainSource; id: number; name: string }
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player || player.spice < 3) return state
  const gains = [...state.gains]
  pushGain(gains, state, playerId, source, -3, RewardType.SPICE)
  pushGain(gains, state, playerId, source, 1, RewardType.VICTORY_POINTS)
  return updatePlayer({ ...state, gains }, playerId, p => ({
    ...p,
    spice: p.spice - 3,
    victoryPoints: p.victoryPoints + 1,
  }))
}

export function applyHoloprojectorsDiscard(
  state: GameState,
  playerId: number,
  cardIds: number[]
): GameState {
  if (cardIds.length !== 1) return state
  const player = state.players.find(p => p.id === playerId)
  if (!player || !validateDiscardCostSelection(player, 1, cardIds)) return state
  return discardFromHand(
    state,
    playerId,
    cardIds[0],
    techActivationSource(TechTileId.HOLOPROJECTORS),
    1
  )
}

export function applyInvasionShipsDiscard(
  state: GameState,
  playerId: number,
  cardIds: number[]
): GameState {
  if (cardIds.length !== 1) return state
  const player = state.players.find(p => p.id === playerId)
  if (!player || !validateDiscardCostSelection(player, 1, cardIds)) return state
  const applied = discardFromHand(
    state,
    playerId,
    cardIds[0],
    techActivationSource(TechTileId.INVASION_SHIPS),
    0
  )
  if (applied === state) return state
  return {
    ...applied,
    infiltrateIgnoreOccupancyOnce: {
      ...(applied.infiltrateIgnoreOccupancyOnce ?? {}),
      [playerId]: true,
    },
  }
}

export function handleActivateTech(state: GameState, action: ActivateTechAction): GameState {
  if (!state.expansions.riseOfIx) return state
  const { playerId, tileId } = action
  if (!tilesActivatableNow(state, playerId).some(t => t.id === tileId)) return state

  const source = techActivationSource(tileId)

  switch (tileId) {
    case TechTileId.FLAGSHIP: {
      const applied = applyFlagshipActivation(state, playerId, source)
      if (applied === state) return state
      return markTileActivated(applied, playerId, tileId)
    }
    case TechTileId.TRAINING_DRONES: {
      const applied = applyTrainingDronesActivation(state, playerId, source)
      return markTileActivated(applied, playerId, tileId)
    }
    case TechTileId.HOLOPROJECTORS: {
      const marked = markTileActivated(state, playerId, tileId)
      return enqueueDiscardChoice(
        marked,
        playerId,
        tileId,
        'Holoprojectors: discard 1 card to draw 1',
        CustomEffect.HOLOPROJECTORS
      )
    }
    case TechTileId.INVASION_SHIPS: {
      const marked = markTileActivated(state, playerId, tileId)
      return enqueueDiscardChoice(
        marked,
        playerId,
        tileId,
        'Invasion Ships: discard 1 card to ignore enemy agents this turn',
        CustomEffect.INVASION_SHIPS
      )
    }
    case TechTileId.SPY_SATELLITES: {
      const applied = applySpySatellitesActivation(state, playerId, source)
      if (applied === state) return state
      return markTileActivated(applied, playerId, tileId, { remove: true })
    }
    case TechTileId.SONIC_SNOOPERS: {
      const marked = markTileActivated(state, playerId, tileId, { remove: true })
      if (marked.intrigueDeck.length === 0) return marked
      return enqueueIntrigueCardChoice(
        marked,
        playerId,
        'Sonic Snoopers: choose an intrigue card from the deck',
        marked.intrigueDeck,
        CustomEffect.SONIC_SNOOPERS,
        { step: 'draw' }
      )
    }
    default:
      return state
  }
}
