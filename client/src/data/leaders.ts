import { Leader, MasterStroke } from '../types/GameTypes'

export const LEADER_NAMES = {
  EARL_MEMNON_THORVALD: "Earl Memnon Thorvald",
  COUNT_ILBAN_RICHESE: "Count Ilban Richese",
  COUNTESS_ARIANA_THORVALD: "Countess Ariana Thorvald",
  HELENA_RICHESE: "Helena Richese",
  BARON_VLADIMIR: "BARON VLADIMIR HARKONNEN",
  BEAST_RABBAN: 'Glossu "The Beast" Rabban',
  DUKE_LETO: "Duke Leto Atreides",
  PAUL_ATREIDES: "Paul Atreides",
} as const

/** Maps leader names to full image paths. Returns undefined if no image exists. */
export const LEADER_IMAGES: Record<string, string> = {
  [LEADER_NAMES.COUNTESS_ARIANA_THORVALD]: '/leaders/ariana.avif',
  [LEADER_NAMES.BARON_VLADIMIR]: '/leaders/baron.avif',
  [LEADER_NAMES.BEAST_RABBAN]: '/leaders/beast.avif',
  [LEADER_NAMES.HELENA_RICHESE]: '/leaders/helena.avif',
  [LEADER_NAMES.COUNT_ILBAN_RICHESE]: '/leaders/ilban.avif',
  [LEADER_NAMES.DUKE_LETO]: '/leaders/leto.avif',
  [LEADER_NAMES.EARL_MEMNON_THORVALD]: '/leaders/memnon.avif',
  [LEADER_NAMES.PAUL_ATREIDES]: '/leaders/paul.avif',
}
export const getLeaderImage = (leaderName: string): string | undefined => LEADER_IMAGES[leaderName]

/** Maps leader names to icon file slugs (e.g. ariana, baron). Used for head icons in leaders/icons/{slug}-head.png */
export const LEADER_ICON_SLUGS: Record<string, string> = {
  [LEADER_NAMES.COUNTESS_ARIANA_THORVALD]: 'ariana',
  [LEADER_NAMES.BARON_VLADIMIR]: 'baron',
  [LEADER_NAMES.BEAST_RABBAN]: 'beast',
  [LEADER_NAMES.HELENA_RICHESE]: 'helena',
  [LEADER_NAMES.COUNT_ILBAN_RICHESE]: 'ilban',
  [LEADER_NAMES.DUKE_LETO]: 'leto',
  [LEADER_NAMES.EARL_MEMNON_THORVALD]: 'memnon',
  [LEADER_NAMES.PAUL_ATREIDES]: 'paul',
}
export const getLeaderIconPath = (leaderName: string): string | undefined => {
  const slug = LEADER_ICON_SLUGS[leaderName]
  return slug ? `/leaders/icons/${slug}-head.png` : undefined
}

export class Baron extends Leader {
  constructor() {
    super(
      LEADER_NAMES.BARON_VLADIMIR,
      {
        name: "Masterstroke",
        description:
          "When you deploy 4+ troops to the Conflict in a turn, choose 2 Factions and gain 1 Influence with each."
      },
      "Pay 1 Solari to gain 1 Intrigue card.",
      2
    )
    this.signetRingTitle = "Scheme"
    this.masterStroke = { triggered: false }
    this.signetRing = null
    this.sogChoice = false
  }

  masterStroke: MasterStroke
  signetRing: null
}

export const LEADERS: Leader[] = [
  {
    name: LEADER_NAMES.COUNTESS_ARIANA_THORVALD,
    ability: {
      name: "Spice Addict",
      description: "Whenever you harvest spice, gain 1 less and draw a card."
    },
    signetRingText: "Gain 1 water.",
    signetRingTitle: "Hidden Reservoir",
    complexity: 1,
    sogChoice: false
  },
  new Baron(),
  {
    name: LEADER_NAMES.BEAST_RABBAN,
    ability: {
      name: "Arrakis Fiefdom",
      description: "Start the game with additional resources: 1 Spice, 1 Solari."
    },
    signetRingText: "Gain 1 Troop OR 2 Troops if you have at least one Faction Alliance.",
    signetRingTitle: "Brutality",
    complexity: 1,
    sogChoice: false
  },
  {
    name: LEADER_NAMES.COUNT_ILBAN_RICHESE,
    ability: {
      name: "Ruthless Negotiator",
      description: "Whenever you pay Solari for the cost of a board space: Draw 1 card."
    },
    signetRingText: "Gain 1 Solari.",
    signetRingTitle: "Manufacturing",
    complexity: 1,
    sogChoice: false
  },
  {
    name: LEADER_NAMES.DUKE_LETO,
    ability: {
      name: "Landsraad popularity",
      description: "Sending an Agent to a Landsraad board space costs you 1 Solari less."
    },
    signetRingText: "Spend 1 Spice: Gain 1 Influence with a Faction where an opponent has more Influence than you.",
    signetRingTitle: "Prudent diplomacy",
    complexity: 1,
    sogChoice: false
  },
  {
    name: LEADER_NAMES.HELENA_RICHESE,
    ability: {
      name: "Eyes Everywhere",
      description: "Enemy Agents don't block your Agents at Landsraad or City board spaces."
    },
    signetRingText: "Remove and replace a card in the Imperium Row. During your Reveal turn this round, you may acquire the removed card for 1 Persuasion less.",
    signetRingTitle: "Manipulate",
    complexity: 2,
    sogChoice: false
  },
  {
    name: LEADER_NAMES.EARL_MEMNON_THORVALD,
    ability: {
      name: "Connections",
      description: "When you take a High Council seat: Gain 1 Influence."
    },
    signetRingText: "Gain 1 Spice.",
    signetRingTitle: "Spice hoard",
    complexity: 1,
    sogChoice: false
  },
  {
    name: LEADER_NAMES.PAUL_ATREIDES,
    ability: {
      name: "Prescience",
      description: "You may look at the top card of your deck at any time."
    },
    signetRingText: "Draw 1 card.",
    signetRingTitle: "Discipline",
    complexity: 1,
    sogChoice: false
  }
]
