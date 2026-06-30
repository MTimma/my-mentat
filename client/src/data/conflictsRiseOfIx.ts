import { ConflictCard, RewardType } from '../types/GameTypes'
//todo check
/** Rise of Ix conflict cards (ids 919–922). */
export const RISE_OF_IX_CONFLICTS: ConflictCard[] = [
  {
    id: 919,
    tier: 1,
    name: 'Skirmish IV',
    rewards: {
      first: [
        { type: RewardType.FREIGHTER, amount: 1 },
        { type: RewardType.TROOPS, amount: 1 },
      ],
      second: [{ type: RewardType.SPICE, amount: 2 }],
      third: [{ type: RewardType.SPICE, amount: 1 }],
    },
  },
  {
    id: 920,
    tier: 1,
    name: 'Skirmish V',
    rewards: {
      first: [
        { type: RewardType.FREIGHTER, amount: 1 },
        { type: RewardType.SPICE, amount: 1 },
      ],
      second: [{ type: RewardType.SOLARI, amount: 3 }],
      third: [{ type: RewardType.SOLARI, amount: 2 }],
    },
  },
  {
    id: 921,
    tier: 3,
    name: 'Economy Supremacy',
    rewards: {
      first: [
        { type: RewardType.VICTORY_POINTS, amount: 1 },
        {
          type: RewardType.VICTORY_POINTS,
          amount: 0,
          choiceOptions: [
            { type: RewardType.VICTORY_POINTS, amount: 1, cost: { solari: 6 } },
            { type: RewardType.VICTORY_POINTS, amount: 1, cost: { spice: 4 } },
          ],
        },
      ],
      second: [{ type: RewardType.VICTORY_POINTS, amount: 1 }],
      third: [
        { type: RewardType.SPICE, amount: 2 },
        { type: RewardType.SOLARI, amount: 2 },
      ],
    },
  },
  {
    id: 922,
    tier: 2,
    name: 'Trade Monopoly',
    rewards: {
      first: [
        { type: RewardType.FREIGHTER, amount: 2 },
        { type: RewardType.TROOPS, amount: 1 },
      ],
      second: [
        { type: RewardType.INTRIGUE, amount: 1 },
        { type: RewardType.WATER, amount: 1 },
      ],
      third: [
        {
          type: RewardType.INTRIGUE,
          amount: 0,
          choiceOptions: [
            { type: RewardType.INTRIGUE, amount: 1 },
            { type: RewardType.WATER, amount: 1 },
          ],
        },
      ],
    },
  },
]

/** Rise of Ix conflict card art filenames (under `public/conflicts/cards/`). */
export const RISE_OF_IX_CONFLICT_CARD_IMAGE_FILE: Partial<Record<number, string>> = {
  919: 'rise_of_ix/skirmish-iv.png',
  920: 'rise_of_ix/skirmish-v.png',
  921: 'rise_of_ix/economy_supremacy.png',
  922: 'rise_of_ix/trade_monopoly.png',
}
