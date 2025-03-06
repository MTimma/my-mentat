import { Leader, MasterStroke } from '../types/GameTypes'


export class Baron extends Leader {
  constructor() {
    super(
      "BARON VLADIMIR HARKONNEN",
      {
        name: "Masterstroke",
        description: "At start of game, secretly choose 2 Factions. When you deploy 4+ troops to the Conflict in a turn, reveal your choices and gain one Influence with each."
      },
      "Pay 1 Solari to gain 1 Intrigue card",
      2
    )
    this.masterStroke = { factions: [], triggered: false }
    this.signetRing = null
  }
  
  masterStroke: MasterStroke
  signetRing: null
}

export const LEADERS: Leader[] = [
  {
    name: "Earl Memnon Thorvald",
    ability: {
      name: "Master Strategist",
      description: "When you acquire a card with at least one sword icon, you may trash a card from your hand."
    },
    signetRingText: "You may trash a card from your hand.",
    complexity: 1
  },
  {
    name: "Count Ilban Richese",
    ability: {
      name: "Technological Superiority",
      description: "When you acquire a card, you may pay 1 Solari to draw a card."
    },
    signetRingText: "Pay 1 Solari to draw a card.",
    complexity: 1
  },
  {
    name: "Countess Ariana Thorvald",
    ability: {
      name: "Subtle Manipulator",
      description: "When you acquire a card with at least one persuasion, gain 1 Solari."
    },
    signetRingText: "Gain 1 Solari.",
    complexity: 1
  },
  {
    name: "Helena Richese",
    ability: {
      name: "Eyes Everywhere",
      description: "Enemy agents do not block your Agents at Landsraaad or City board spaces"
    },
    signetRingText: "Remove and replace a card in the Imperium Row. During you reveal this round, you may acquire the removed card for 1 Persuasion less.",
    complexity: 2
  },
  new Baron()
] 