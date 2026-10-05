import { describe, expect, it } from 'vitest'
import { RISE_OF_IX_IMPERIUM_DECK } from '../../../data/cardsRiseOfIx'
import { TechTileId } from '../../../data/techTiles'
import {
  ChoiceType,
  CustomEffect,
  GamePhase,
  NO_EXPANSIONS,
  TurnType,
} from '../../../types/GameTypes'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { makePlayer } from './_helpers'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }

describe('tech discard → unload freighter must not unlock End Turn', () => {
  it('Holoprojectors discard Freighter Fleet unload recall leaves End Turn blocked until agent/reveal', () => {
    const freighterFleet = structuredClone(
      RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === 'Freighter Fleet')!
    )
    freighterFleet.id = 99050

    let s = {
      ...getFreshDefaultGameState(),
      expansions: RISE_OF_IX,
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLOPROJECTORS, faceUp: true }],
          deck: [freighterFleet],
          handCount: 1,
          freighterStep: 2,
          solari: 0,
        }),
        makePlayer(1),
      ],
      phase: GamePhase.PLAYER_TURNS,
      activePlayerId: 0,
      selectedCard: null as number | null,
      currTurn: { playerId: 0, type: TurnType.ACTION },
      canEndTurn: false,
    }

    s = applyGameAction(s, {
      type: 'ACTIVATE_TECH_DISCARD',
      playerId: 0,
      tileId: TechTileId.HOLOPROJECTORS,
      cardIds: [freighterFleet.id],
    })

    const freighterChoice = s.currTurn?.pendingChoices?.find(
      c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt.startsWith('Freighter')
    )
    expect(freighterChoice).toBeDefined()

    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: freighterChoice!.id,
      optionIndex: freighterChoice!.options.findIndex(
        o => o.reward?.custom === CustomEffect.FREIGHTER_RECALL
      ),
    })

    let guard = 0
    while ((s.currTurn?.pendingChoices?.length ?? 0) > 0 && guard++ < 20) {
      const choice = s.currTurn!.pendingChoices![0]
      if (choice.type !== ChoiceType.FIXED_OPTIONS) break
      s = applyGameAction(s, {
        type: 'RESOLVE_CHOICE',
        playerId: 0,
        choiceId: choice.id,
        optionIndex: 0,
      })
    }
    while (s.pendingRewards.some(r => !r.disabled) && guard++ < 30) {
      s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    }

    expect(s.currTurn?.pendingChoices ?? []).toHaveLength(0)
    expect(s.pendingRewards.filter(r => !r.disabled)).toHaveLength(0)
    expect(s.currTurn?.agentSpaceId).toBeUndefined()
    expect(s.currTurn?.type).not.toBe(TurnType.REVEAL)
    expect(s.selectedCard).toBeNull()

    // Must not look like a finished turn — no agent / reveal yet.
    expect(s.canEndTurn).toBe(false)

    const afterEnd = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(afterEnd).toBe(s)
    expect(afterEnd.activePlayerId).toBe(0)
  })
})
