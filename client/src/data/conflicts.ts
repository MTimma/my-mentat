import { ConflictCard, RewardType } from "../types/GameTypes";

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
        amount: 1
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
        amount: 1
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
  }
]