import { describe, expect, it } from 'vitest'
import { collectLiveIds, mintId, nextSemanticId, semanticIdBase } from '../semanticIds'
import { ChoiceType, GainSource } from '../../types/GameTypes'
import type { GameState, GameTurn } from '../../types/GameTypes'

const card12 = { type: GainSource.CARD, id: 12 }

describe('semantic ids', () => {
  it('builds base ids from source and kind', () => {
    expect(semanticIdBase(card12, 'OR')).toBe('card-12-OR')
    expect(semanticIdBase({ type: GainSource.BOARD_SPACE, id: 7 }, 'INFLUENCE-GAIN')).toBe(
      'board-space-7-INFLUENCE-GAIN'
    )
  })

  it('omits occurrence 0 and counts duplicates per (source, kind)', () => {
    expect(nextSemanticId(card12, 'OR', [])).toBe('card-12-OR')
    expect(nextSemanticId(card12, 'OR', ['card-12-OR'])).toBe('card-12-OR-1')
    expect(nextSemanticId(card12, 'OR', ['card-12-OR', 'card-12-OR-1'])).toBe('card-12-OR-2')
  })

  it('unrelated ids do not shift the occurrence counter', () => {
    const existing = [
      'card-31-TRASH',
      'board-space-12-REWARD',
      'card-12-INFLUENCE-GAIN', // different kind, same source
      'card-120-OR', // different source whose prefix is NOT card-12- (card-120)
    ]
    expect(nextSemanticId(card12, 'OR', existing)).toBe('card-12-OR')
  })

  it('does not confuse multi-word kinds with numeric occurrence suffixes', () => {
    // 'card-12-OR-EXTRA' is a different kind, not occurrence of OR
    expect(nextSemanticId(card12, 'OR', ['card-12-OR-EXTRA'])).toBe('card-12-OR')
  })

  it('is deterministic across repeated invocations', () => {
    const existing = ['card-12-OR', 'card-12-OR-1']
    expect(nextSemanticId(card12, 'OR', existing)).toBe(
      nextSemanticId(card12, 'OR', [...existing])
    )
  })

  it('collectLiveIds gathers from rewards, choices, optional effects and conflict choices', () => {
    const currTurn = {
      playerId: 0,
      pendingChoices: [
        { id: 'card-1-OR', type: ChoiceType.FIXED_OPTIONS, prompt: '', options: [], source: { type: GainSource.CARD, id: 1, name: 'x' } },
      ],
      optionalEffects: [
        { id: 'card-2-EFFECT', cost: {}, reward: {}, source: { type: GainSource.CARD, id: 2, name: 'y' } },
      ],
    } as unknown as GameTurn
    const state = {
      pendingRewards: [
        { id: 'board-space-3-REWARD', source: { type: GainSource.BOARD_SPACE, id: 3, name: 'z' }, reward: {}, isTrash: false },
      ],
      pendingConflictRewardChoices: [
        { id: 'conflict-901-CONFLICT-REWARD-first-0', playerId: 0, placement: 'first', conflictId: 901, conflictName: 'c', options: [] },
      ],
      currTurn,
    } as unknown as Pick<GameState, 'pendingRewards' | 'pendingConflictRewardChoices'> & { currTurn: GameTurn }

    expect(collectLiveIds(state).sort()).toEqual([
      'board-space-3-REWARD',
      'card-1-OR',
      'card-2-EFFECT',
      'conflict-901-CONFLICT-REWARD-first-0',
    ])
    expect(mintId(state, { type: GainSource.CARD, id: 1 }, 'OR')).toBe('card-1-OR-1')
    expect(mintId(state, { type: GainSource.CARD, id: 1 }, 'OR', ['card-1-OR-1'])).toBe('card-1-OR-2')
  })
})
