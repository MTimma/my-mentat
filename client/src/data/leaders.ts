import { Leader, MasterStroke } from '../types/GameTypes'

export const LEADER_NAMES = {
  EARL_MEMNON_THORVALD: "Earl Memnon Thorvald",
  COUNT_ILBAN_RICHESE: "Count Ilban Richese",
  COUNTESS_ARIANA_THORVALD: "Countess Ariana Thorvald",
  HELENA_RICHESE: "Helena Richese",
  BARON_VLADIMIR: "BARON VLADIMIR HARKONNEN",
} as const

/** Maps leader names to image paths. Returns undefined if no image exists. */
export const LEADER_IMAGES: Record<string, string> = {
  [LEADER_NAMES.BARON_VLADIMIR]: '/baron.avif',
}
export const getLeaderImage = (leaderName: string): string | undefined => LEADER_IMAGES[leaderName]

export class Baron extends Leader {
  constructor() {
    super(
      "BARON VLADIMIR HARKONNEN",
      {
        name: "Masterstroke",
        description: "When you deploy 4+ troops to the Conflict in a turn, choose 2 Factions and gain one Influence with each."
      },
      "Pay 1 Solari to gain 1 Intrigue card",
      2
    )
    this.masterStroke = { triggered: false }
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