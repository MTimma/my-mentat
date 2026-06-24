import { describe, expect, it } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../../components/GameContext/GameContext'
import { IMPERIUM_ROW_DECK } from '../../catalog/runtime'
import {
  ChoiceType,
  CustomEffect,
  FactionType,
  GamePhase,
  GainSource,
  Leader,
  PlayerColor,
  RewardType,
  type Card,
  type GameState,
  type Player,
} from '../../types/GameTypes'
import { LEADER_NAMES } from '../leaders'
import { seedTessiaSnoopers } from '../leaderAbilities/tessiaSnoopers'
import { seedTroopSupply } from '../../utils/troops'
import { intrigueCards } from '../../services/IntrigueDeckService'

function tessiaLeader(): Leader {
  return new Leader(
    LEADER_NAMES.TESSIA_VERNIUS,
    { name: 'Subtle Subterfuge', description: 'Snoopers' },
    'Signet',
    4
  )
}

function tessiaPlayer(id = 0): Player {
  return seedTessiaSnoopers(
    seedTroopSupply({
      id,
      color: PlayerColor.RED,
      leader: tessiaLeader(),
      troops: 8,
      spice: 10,
      water: 3,
      solari: 20,
      victoryPoints: 0,
      agents: 2,
      persuasion: 0,
      combatValue: 0,
      hasSwordmaster: false,
      hasHighCouncilSeat: false,
      handCount: 5,
      revealed: false,
      intrigueCount: 1,
      deck: [],
      discardPile: [],
      playArea: [],
      trash: [],
    }),
    true
  )
}

function powerPlayCard(): Card {
  const card = IMPERIUM_ROW_DECK.find(c => c.name === 'Power Play')
  if (!card) throw new Error('Power Play not found')
  return structuredClone(card)
}

function roiState(players: Player[]): GameState {
  const s = getFreshDefaultGameState()
  return {
    ...s,
    expansions: { riseOfIx: true, riseOfIxEpic: false },
    players,
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    firstPlayerMarker: 0,
    intrigueDeck: [...intrigueCards],
    combatPasses: new Set(),
    endgameDonePlayers: new Set(),
    currTurn: null,
    selectedCard: null,
    combatTroops: {},
    combatStrength: {},
    mentatOwner: null,
    factionInfluence: {
      [FactionType.EMPEROR]: { 0: 0 },
      [FactionType.SPACING_GUILD]: { 0: 0 },
      [FactionType.BENE_GESSERIT]: { 0: 0 },
      [FactionType.FREMEN]: { 0: 0 },
    },
  }
}

describe('Tessia snooper integration', () => {
  it('claims slot 1 when Wealth influence reaches 2 (Power Play doubled)', () => {
    let s = roiState([tessiaPlayer()])
    s.players[0].deck = [powerPlayCard()]

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1040 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const powerPlayReward = s.pendingRewards.find(r => r.reward.custom === CustomEffect.POWER_PLAY)
    expect(powerPlayReward).toBeDefined()
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: powerPlayReward!.id })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    expect(influenceReward?.powerPlay).toBe(true)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })

    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(2)
    expect(s.players[0].snoopers?.[FactionType.EMPEROR]).toBe(false)
    expect(s.players[0].leader.tessiaSnoopers?.[FactionType.EMPEROR]).toBe(true)
    expect(s.players[0].leader.tessiaSnooperRewardSlot).toBe(2)
    expect(s.currTurn?.pendingChoices?.some(c => c.prompt.includes('discard'))).toBe(true)
  })

  it('claims when single +1 crosses to 2 without Power Play', () => {
    let s = roiState([tessiaPlayer()])
    s.factionInfluence[FactionType.EMPEROR][0] = 1
  s.players[0].deck = [{ id: 9001, name: 'Stub', image: '', agentIcons: [] }]

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 9001 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })

    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(2)
    expect(s.players[0].snoopers?.[FactionType.EMPEROR]).toBe(false)
    expect(s.currTurn?.pendingChoices?.some(c => c.prompt.includes('discard'))).toBe(true)
  })

  it('attributes discard-for-spice gains to Tessia snooper in history', () => {
    let s = roiState([tessiaPlayer()])
    s.factionInfluence[FactionType.EMPEROR][0] = 1
    const playCard = { id: 9001, name: 'Stub', image: '', agentIcons: [] }
    const handCard = { id: 9002, name: 'Hand', image: '', agentIcons: [] }
    s.players[0].deck = [playCard, handCard]
    s.players[0].handCount = 2

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 9001 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })

    const snooperChoice = s.currTurn?.pendingChoices?.find(c => c.prompt.includes('discard'))
    expect(snooperChoice).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: snooperChoice!.id,
      optionIndex: 0,
    })

    const cardSelect = s.currTurn?.pendingChoices?.find(c => c.type === ChoiceType.CARD_SELECT)
    expect(cardSelect).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: cardSelect!.id,
      cardIds: [9002],
    })

    const spiceGain = s.gains.find(
      g => g.type === RewardType.SPICE && g.playerId === 0 && g.amount === 1
    )
    expect(spiceGain?.source).toBe(GainSource.TESSIA_SNOOPER)
    expect(spiceGain?.sourceId).toBe(1)
    expect(spiceGain?.name).toBe('Tessia snooper (emperor)')
  })

  it('claims slot 2 BG bonus once when intrigue was claimed before influence (sandbox slot 2)', () => {
    const leader = tessiaLeader()
    leader.tessiaSnooperRewardSlot = 2
    let s = roiState([seedTessiaSnoopers(seedTroopSupply({
      id: 0,
      color: PlayerColor.RED,
      leader,
      troops: 8,
      spice: 10,
      water: 3,
      solari: 20,
      victoryPoints: 0,
      agents: 2,
      persuasion: 0,
      combatValue: 0,
      hasSwordmaster: false,
      hasHighCouncilSeat: false,
      handCount: 5,
      revealed: false,
      intrigueCount: 0,
      deck: [powerPlayCard()],
      discardPile: [],
      playArea: [],
      trash: [],
    }), true)])

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1040 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 18 })

    const intrigueReward = s.pendingRewards.find(r => r.reward.intrigueCards)
    expect(intrigueReward).toBeDefined()
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: intrigueReward!.id })
    expect(s.players[0].intrigueCount).toBe(1)

    const powerPlayReward = s.pendingRewards.find(r => r.reward.custom === CustomEffect.POWER_PLAY)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: powerPlayReward!.id })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })

    expect(s.players[0].intrigueCount).toBe(2)
    expect(s.players[0].snoopers?.[FactionType.BENE_GESSERIT]).toBe(false)
    const tessiaIntrigueGains = s.gains.filter(
      g =>
        g.type === RewardType.INTRIGUE &&
        g.source === GainSource.TESSIA_SNOOPER &&
        g.playerId === 0
    )
    expect(tessiaIntrigueGains).toHaveLength(1)
    expect(tessiaIntrigueGains[0].amount).toBe(1)
  })

  it('claims when board influence is claimed before Power Play (+1 then +1)', () => {
    let s = roiState([tessiaPlayer()])
    s.players[0].deck = [powerPlayCard()]

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1040 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)
    expect(s.players[0].snoopers?.[FactionType.EMPEROR]).not.toBe(false)

    const powerPlayReward = s.pendingRewards.find(r => r.reward.custom === CustomEffect.POWER_PLAY)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: powerPlayReward!.id })

    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(2)
    expect(s.players[0].snoopers?.[FactionType.EMPEROR]).toBe(false)
    expect(s.players[0].leader.tessiaSnoopers?.[FactionType.EMPEROR]).toBe(true)
    expect(s.players[0].leader.tessiaSnooperRewardSlot).toBe(2)
    expect(s.currTurn?.pendingChoices?.some(c => c.prompt.includes('discard'))).toBe(true)
  })

  it('claims when sandbox left influence at 2 and Wealth adds +1 (catch-up at 2→3)', () => {
    let s = roiState([tessiaPlayer()])
    s.factionInfluence[FactionType.EMPEROR][0] = 2
    s.players[0].deck = [powerPlayCard()]

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 1040 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })

    const powerPlayReward = s.pendingRewards.find(r => r.reward.custom === CustomEffect.POWER_PLAY)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: powerPlayReward!.id })

    const influenceReward = s.pendingRewards.find(r => r.reward.influence)
    s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: influenceReward!.id })

    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(4)
    expect(s.players[0].snoopers?.[FactionType.EMPEROR]).toBe(false)
    expect(s.players[0].leader.tessiaSnooperRewardSlot).toBe(2)
  })
})
