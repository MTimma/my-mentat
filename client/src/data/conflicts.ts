import { ConflictCard, RewardType } from "../types/GameTypes";

export const conflicts: ConflictCard[] = [
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
  }
]