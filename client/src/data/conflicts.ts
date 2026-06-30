import { ConflictCard, ControlMarkerType, Expansions, RewardType } from "../types/GameTypes";

export const CONFLICTS: ConflictCard[] = [
//   {
//     tier: 1,
//     name: "Skirmish",
//     rewards: {
//       first: [{
//         type: 'victoryPoints',
//         amount: 1
//       }],
//       second: [{
//         type: 'intrigueCards',
//         amount: 1
//       },{
//         type: 'solari',
//         amount: 2
//       }],
//       third: [{
//         type: 'solari',
//         amount: 2
//       }]
//     }
//   }, {
{
    id: 901,
    tier: 1,
    name: "Skirmish",
    rewards: {
      first: [{
        type: RewardType.VICTORY_POINTS,
        amount: 1
      }],
      second: [{
        type: RewardType.WATER,
        amount: 1
      }],
      third: [{
        type: RewardType.SPICE,
        amount: 1
      }]
    }
  },
  {
    id: 902,
    tier: 1,
    name: "Skirmish",
    rewards: {
      first: [{
        type: RewardType.VICTORY_POINTS,
        amount: 1
      }],
      second: [{
        type: RewardType.SOLARI,
        amount: 2
      },{
        type: RewardType.INTRIGUE,
        amount: 1
      }],
      third: [{
        type: RewardType.SOLARI,
        amount: 2
      }]
    }
  },
  {
    id: 903,
    tier: 1,
    name: "Skirmish",
    rewards: {
      first: [{
        type: RewardType.INFLUENCE,
        amount: 1,
        chooseFaction: true,
      }, {
        type: RewardType.SPICE,
          amount: 1
      }],
      second: [{
        type: RewardType.SPICE,
        amount: 2
      }],
      third: [{
        type: RewardType.SPICE,
        amount: 1
      }]
    }
  },{
    id: 904,
    tier: 1,
    name: "Skirmish",
    rewards: {
      first: [{
        type: RewardType.INFLUENCE,
        amount: 1,
        chooseFaction: true,
      }, {
        type: RewardType.SOLARI,
          amount: 2
      }],
      second: [{
        type: RewardType.SOLARI,
        amount: 3
      }],
      third: [{
        type: RewardType.SOLARI,
        amount: 2
      }]
    }
  },
  // Tier 2 conflicts (rounds 2-6)
  {
    id: 905,
    tier: 2,
    name: "Siege of Arrakeen",
    controlSpace: ControlMarkerType.ARRAKIN,
    rewards: {
      first: [
        { type: RewardType.VICTORY_POINTS, amount: 1 },
        { type: RewardType.CONTROL, amount: 1 }
      ],
      second: [{ type: RewardType.SOLARI, amount: 4 }],
      third: [{ type: RewardType.SOLARI, amount: 2 }]
    }
  },
  {
    id: 906,
    tier: 2,
    name: "Siege of Carthag",
    controlSpace: ControlMarkerType.CARTHAG,
    rewards: {
      first: [
        { type: RewardType.VICTORY_POINTS, amount: 1 },
        { type: RewardType.CONTROL, amount: 1 }
      ],
      second: [{ type: RewardType.SPICE, amount: 1 }, { type: RewardType.INTRIGUE, amount: 1 }],
      third: [{ type: RewardType.SPICE, amount: 1 }]
    }
  },
  {
    id: 907,
    tier: 2,
    name: "Secure Imperial Basin",
    controlSpace: ControlMarkerType.IMPERIAL_BASIN,
    rewards: {
      first: [
        { type: RewardType.VICTORY_POINTS, amount: 1 },
        { type: RewardType.CONTROL, amount: 1 }
      ],
      second: [{ type: RewardType.WATER, amount: 2 }],
      third: [{ type: RewardType.WATER, amount: 1 }]
    }
  },
  {
    id: 908,
    tier: 2,
    name: "Cloak and Dagger",
    rewards: {
      first: [{ type: RewardType.INFLUENCE, amount: 1, chooseFaction: true },{ type: RewardType.INTRIGUE, amount: 2 }],
      second: [{ type: RewardType.INTRIGUE, amount: 1 }, { type: RewardType.SPICE, amount: 1 }],
      third: [{
        type: RewardType.INTRIGUE,//todo why this
        amount: 0,
        choiceOptions: [
          { type: RewardType.INTRIGUE, amount: 1 },
          { type: RewardType.SPICE, amount: 1 }
        ]
      }]
    }
  },
  {
    id: 909,
    tier: 2,
    name: "Machinations",
    distinctInfluenceFactions: true,
    rewards: {
      first: [{ type: RewardType.INFLUENCE, amount: 1, chooseFaction: true }, { type: RewardType.INFLUENCE, amount: 1, chooseFaction: true }],
      second: [{ type: RewardType.SOLARI, amount: 3 }],
      third: [{ type: RewardType.SPICE, amount: 1 }]
    }
  },
  {
    id: 910,
    tier: 2,
    name: "Desert Power",
    rewards: {
      first: [{ type: RewardType.VICTORY_POINTS, amount: 1 }, { type: RewardType.WATER, amount: 1 }],
      second: [{ type: RewardType.SPICE, amount: 1 },{ type: RewardType.WATER, amount: 1 }],
      third: [{ type: RewardType.SPICE, amount: 1 }]
    }
  },
  {
    id: 911,
    tier: 2,
    name: "Raid Stockpiles",
    rewards: {
      first: [{ type: RewardType.SPICE, amount: 3 }, { type: RewardType.INTRIGUE, amount: 1 }],
      second: [{ type: RewardType.SPICE, amount: 2 }],
      third: [{ type: RewardType.SPICE, amount: 1 }]
    }
  },
  {
    id: 912,
    tier: 2,
    name: "Sort Through The Chaos",
    rewards: {
      first: [{type: RewardType.MENTAT, amount: 1}, {type: RewardType.INTRIGUE, amount: 1}, { type: RewardType.SOLARI, amount: 2 }],
      second: [{type: RewardType.INTRIGUE, amount: 1}, { type: RewardType.SOLARI, amount: 2 }],
      third: [{ type: RewardType.SOLARI, amount: 2 }]
    }
  },
  {
    id: 913,
    tier: 2,
    name: "Guild Bank Raid",
    rewards: {
      first: [{ type: RewardType.SOLARI, amount: 6 }],
      second: [{ type: RewardType.SOLARI, amount: 4 }],
      third: [{ type: RewardType.SOLARI, amount: 2 }]
    }
  },
  {
    id: 914,
    tier: 2,
    name: "Terrible Purpose",
    rewards: {
      first: [{ type: RewardType.VICTORY_POINTS, amount: 1 }, { type: RewardType.TRASH, amount: 1 }],
      second: [{ type: RewardType.SPICE, amount: 1 },{ type: RewardType.WATER, amount: 1 }],
      third: [{ type: RewardType.SPICE, amount: 1 }]
    }
  },
  // Tier 3 conflicts (rounds 7+)
  //todo check
  {
    id: 915,
    tier: 3,
    name: "Battle for Imperial Basin",
    controlSpace: ControlMarkerType.IMPERIAL_BASIN,
    rewards: {
      first: [
        { type: RewardType.VICTORY_POINTS, amount: 2 },
        { type: RewardType.CONTROL, amount: 1 },
      ],
      second: [{ type: RewardType.SPICE, amount: 5 }],
      third: [{ type: RewardType.SPICE, amount: 3 }],
    },
  },
  {
    id: 916,
    tier: 3,
    name: "Battle for Arrakeen",
    controlSpace: ControlMarkerType.ARRAKIN,
    rewards: {
      first: [
        { type: RewardType.VICTORY_POINTS, amount: 2 },
        { type: RewardType.CONTROL, amount: 1 },
      ],
      second: [{
        type: RewardType.INTRIGUE,
        amount: 0,
        choiceOptions: [
          { type: RewardType.INTRIGUE, amount: 1 },
          { type: RewardType.SPICE, amount: 2 },
          { type: RewardType.SOLARI, amount: 3 },
        ],
      }],
      third: [
        { type: RewardType.INTRIGUE, amount: 1 },
        { type: RewardType.SOLARI, amount: 2 },
      ],
    },
  },
  {
    id: 917,
    tier: 3,
    name: "Battle for Carthag",
    controlSpace: ControlMarkerType.CARTHAG,
    rewards: {
      first: [
        { type: RewardType.VICTORY_POINTS, amount: 2 },
        { type: RewardType.CONTROL, amount: 1 },
      ],
      second: [
        { type: RewardType.INTRIGUE, amount: 1 },
        { type: RewardType.SPICE, amount: 3 },
      ],
      third: [{ type: RewardType.SPICE, amount: 3 }],
    },
  },
  {
    id: 918,
    tier: 3,
    name: "Grand Vision",
    rewards: {
      first: [
        { type: RewardType.INFLUENCE, amount: 2, chooseFaction: true },
        { type: RewardType.INTRIGUE, amount: 1 },
      ],
      second: [
        { type: RewardType.INTRIGUE, amount: 1 },
        { type: RewardType.SOLARI, amount: 3 },
      ],
      third: [{ type: RewardType.SOLARI, amount: 3 }],
    },
  },
]

export { RISE_OF_IX_CONFLICTS } from './conflictsRiseOfIx'
import { RISE_OF_IX_CONFLICTS } from './conflictsRiseOfIx'

export function getConflictPool(expansions: Expansions): ConflictCard[] {
  return expansions.riseOfIx ? [...CONFLICTS, ...RISE_OF_IX_CONFLICTS] : CONFLICTS
}