import { describe, expect, it } from 'vitest'
import {
  conflictChoiceAsFixedOptions,
  findConflictInfluenceBoardChoice,
  getInfluenceBoardChoiceMeta,
  getInfluenceBoardPrompt,
  isInfluenceBoardChoice,
} from '../influenceBoardChoice'
import {
  ChoiceType,
  FactionType,
  FixedOptionsChoice,
  GainSource,
  type GameState,
} from '../../types/GameTypes'
import { getFreshDefaultGameState } from '../../components/GameContext/GameContext'

function loseChoice(): FixedOptionsChoice {
  return {
    id: 'card-1051-INFLUENCE-LOSE',
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Choose a faction to lose 1 influence',
    options: [
      {
        reward: { influence: { amounts: [{ faction: FactionType.EMPEROR, amount: -1 }] } },
        disabled: false,
      },
      {
        reward: { influence: { amounts: [{ faction: FactionType.FREMEN, amount: -1 }] } },
        disabled: true,
      },
    ],
    source: { type: GainSource.CARD, id: 1051, name: 'Shifting Allegiances' },
  }
}

describe('influenceBoardChoice', () => {
  it('detects single-faction influence fixed options', () => {
    expect(isInfluenceBoardChoice(loseChoice())).toBe(true)
  })

  it('builds lose/gain prompts', () => {
    expect(getInfluenceBoardPrompt('lose', 1)).toBe('Choose where to lose influence')
    expect(getInfluenceBoardPrompt('gain', 2)).toBe('Choose where to gain 2 influence')
  })

  it('lists selectable factions from live influence', () => {
    const base = getFreshDefaultGameState()
    const state: GameState = {
      ...base,
      factionInfluence: {
        ...base.factionInfluence,
        [FactionType.EMPEROR]: { 0: 2 },
        [FactionType.FREMEN]: { 0: 0 },
      },
    }
    const meta = getInfluenceBoardChoiceMeta(loseChoice(), state, 0)
    expect(meta?.selectableFactions).toEqual([FactionType.EMPEROR])
    expect(meta?.disabledFactions).toEqual([FactionType.FREMEN])
    expect(meta?.optionIndexByFaction[FactionType.EMPEROR]).toBe(0)
  })

  it('detects conflict reward influence choices for board selection', () => {
    const conflictChoice = {
      id: 'conflict-903',
      playerId: 0,
      placement: '1st place',
      conflictId: 903,
      conflictName: 'Skirmish',
      options: [
        { reward: { influence: { amounts: [{ faction: FactionType.EMPEROR, amount: 1 }] } } },
        { reward: { influence: { amounts: [{ faction: FactionType.SPACING_GUILD, amount: 1 }] } } },
        { reward: { influence: { amounts: [{ faction: FactionType.BENE_GESSERIT, amount: 1 }] } } },
        { reward: { influence: { amounts: [{ faction: FactionType.FREMEN, amount: 1 }] } } },
      ],
    }
    expect(isInfluenceBoardChoice(conflictChoiceAsFixedOptions(conflictChoice))).toBe(true)
    expect(findConflictInfluenceBoardChoice([conflictChoice])?.id).toBe('conflict-903')
  })
})
