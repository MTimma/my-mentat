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
    this.sogChoice = true
  }
  
  masterStroke: MasterStroke
  signetRing: null
}

export const LEADERS: Leader[] = [
  {
    name: "Earl Memnon Thorvald",
    ability: {
      name: "Master Strategist",
      description: ""
    },
    signetRingText: "You may trash a card from your hand.",
    complexity: 1,
    sogChoice: false
  },
  {
    name: "Count Ilban Richese",
    ability: {
      name: "Technological Superiority",
      description: ""
    },
    signetRingText: "",
    complexity: 1,
    sogChoice: false
  },
  {
    name: "Countess Ariana Thorvald",
    ability: {
      name: "Subtle Manipulator",
      description: ""
    },
    signetRingText: "",
    complexity: 1,
    sogChoice: false
  },
  {
    name: "Helena Richese",
    ability: {
      name: "Eyes Everywhere",
      description: ""
    },
    signetRingText: "Remove and replace a card in the Imperium Row. During you reveal this round, you may acquire the removed card for 1 Persuasion less.",
    complexity: 2,
    sogChoice: false
  },
  new Baron()
] 