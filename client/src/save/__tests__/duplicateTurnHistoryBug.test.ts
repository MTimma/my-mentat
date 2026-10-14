import { describe, it, expect } from 'vitest'
import { applyRecordedAction } from '../../components/GameContext/GameContext'
import { buildHistoryFromEvents } from '../buildHistory'
import { replaySaveDoc } from '../replay'
import { GamePhase } from '../../types/GameTypes'
import { isPlayerTurnHistoryEntry, isRoundStartHistoryEntry } from '../../utils/turnHistoryDisplay'
import { buildInitialState } from '../buildInitialState'
import { getPlayerTurnNumber } from '../../utils/turnHistoryDisplay'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSaveDocJson } from '../parseSaveDoc'
import type { SaveDoc } from '../types'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function loadFixtureDoc(name: string): SaveDoc {
  const path = join(FIXTURES_DIR, `${name}.json`)
  const raw = readFileSync(path, 'utf8')
  const result = parseSaveDocJson(raw)
  if (!result.ok) {
    throw new Error(`Invalid save fixture "${name}": ${result.error}`)
  }
  return result.doc
}

describe('duplicate turn history bug', () => {
  it('turn 29 END_TURN replay is blocked by unclaimed Foldspace trash reward', () => {
    const saveDoc = loadFixtureDoc('duplicate-turn-bug')
    let state = buildInitialState(saveDoc.setup)
    for (let i = 0; i < saveDoc.events.length; i++) {
      const action = saveDoc.events[i].a
      const ctx = saveDoc.events[i].ctx
      if (action.type === 'END_TURN' && ctx?.turn === 29) {
        const before = state
        const next = applyRecordedAction(state, action).state
        expect(next).toBe(before)
        expect(before.pendingRewards?.some(r => !r.disabled && r.id === 'card-406-REWARD-1')).toBe(true)
        return
      }
      state = applyRecordedAction(state, action).state
    }
    throw new Error('turn 29 END_TURN not found')
  })

  it('player turns before the duplicated Foldspace row stay distinct', () => {
    const saveDoc = loadFixtureDoc('duplicate-turn-bug')
    const history = buildHistoryFromEvents(saveDoc.setup, saveDoc.events)

    const playerTurns = history
      .map((turn, index) => ({ turn, index, num: getPlayerTurnNumber(history, index) }))
      .filter(({ num }) => num != null && num >= 26 && num <= 29)

    expect(playerTurns.length).toBe(4)

    const summaries = playerTurns.map(({ turn, num }) => {
      const spaceId = turn.currTurn?.agentSpaceId
      const space = BOARD_SPACES.find(s => s.id === spaceId)
      return {
        num,
        playerId: turn.currTurn?.playerId,
        spaceId,
        spaceName: space?.name,
        cardId: turn.currTurn?.cardId,
      }
    })

    const keys = summaries.map(s => `${s.playerId}-${s.spaceId}-${s.cardId}`)
    expect(new Set(keys).size).toBe(4)
  })

  it('legacy combat resolve advances past round 1 and keeps each leader’s turns', () => {
    const saveDoc = loadFixtureDoc('duplicate-turn-bug')
    const { state } = replaySaveDoc(saveDoc)
    expect(state.currentRound).toBeGreaterThan(1)
    expect(state.phase).not.toBe(GamePhase.COMBAT_REWARDS)

    const history = buildHistoryFromEvents(saveDoc.setup, saveDoc.events)
    expect(history.some(row => isRoundStartHistoryEntry(row) && row.currentRound >= 2)).toBe(true)
    const leaders = new Set(
      history.filter(isPlayerTurnHistoryEntry).map(row => row.currTurn?.playerId)
    )
    expect(leaders.size).toBeGreaterThan(1)
  })
})
