import { Expansions, Leader, MasterStroke } from '../types/GameTypes'

export const LEADER_NAMES = {
  EARL_MEMNON_THORVALD: "Earl Memnon Thorvald",
  COUNT_ILBAN_RICHESE: "Count Ilban Richese",
  COUNTESS_ARIANA_THORVALD: "Countess Ariana Thorvald",
  HELENA_RICHESE: "Helena Richese",
  BARON_VLADIMIR: "BARON VLADIMIR HARKONNEN",
  BEAST_RABBAN: 'Glossu "The Beast" Rabban',
  DUKE_LETO: "Duke Leto Atreides",
  PAUL_ATREIDES: "Paul Atreides",
  PRINCE_RHOMBUR_VERNIUS: "Prince Rhombur Vernius",
  VISCOUNT_HUDRO_MORITANI: "Viscount Hudro Moritani",
  PRINCESS_YUNA_MORITANI: '"Princess" Yuna Moritani',
  ARCHDUKE_ARMAND_ECAZ: "Archduke Armand Ecaz",
  ILESA_ECAZ: "Ilesa Ecaz",
  TESSIA_VERNIUS: "Tessia Vernius",
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
  [LEADER_NAMES.PRINCE_RHOMBUR_VERNIUS]: '/leaders/rise_of_ix/prince_rhombur_vernius.jpg',
  [LEADER_NAMES.VISCOUNT_HUDRO_MORITANI]: '/leaders/rise_of_ix/viscount_hudro_moritani.jpg',
  [LEADER_NAMES.PRINCESS_YUNA_MORITANI]: '/leaders/rise_of_ix/princess_yuna_moritani.jpg',
  [LEADER_NAMES.ARCHDUKE_ARMAND_ECAZ]: '/leaders/rise_of_ix/archduke_armand_ecaz.jpg',
  [LEADER_NAMES.ILESA_ECAZ]: '/leaders/rise_of_ix/ilesa_ecaz.jpg',
  [LEADER_NAMES.TESSIA_VERNIUS]: '/leaders/rise_of_ix/tessia_vernius.jpg',
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
  [LEADER_NAMES.PRINCE_RHOMBUR_VERNIUS]: 'prince-rhombur-vernius',
  [LEADER_NAMES.VISCOUNT_HUDRO_MORITANI]: 'viscount-hudro-moritani',
  [LEADER_NAMES.PRINCESS_YUNA_MORITANI]: 'princess-yuna-moritani',
  [LEADER_NAMES.ARCHDUKE_ARMAND_ECAZ]: 'archduke-armand-ecaz',
  [LEADER_NAMES.ILESA_ECAZ]: 'ilesa-ecaz',
  [LEADER_NAMES.TESSIA_VERNIUS]: 'tessia-vernius',
}
export const getLeaderIconPath = (leaderName: string): string | undefined => {
  const portraitPath = LEADER_IMAGES[leaderName]
  if (portraitPath?.startsWith('/leaders/rise_of_ix/')) {
    const basename = portraitPath.slice('/leaders/rise_of_ix/'.length)
    return basename ? `/leaders/rise_of_ix/icons/${basename}` : undefined
  }
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

/** Rise of Ix leaders (6 new; Baron remains in base LEADERS pool). */
export const RISE_OF_IX_LEADERS: Leader[] = [
  {
    name: LEADER_NAMES.PRINCE_RHOMBUR_VERNIUS,
    ability: {
      name: 'Ixian Royalty',
      description: 'Your dreadnoughts have a strength of 4 instead of 3.',
    },
    signetRingText: 'Buy 1 tech, or add 1 tech negotiator.',
    signetRingTitle: 'Tech Negotiation',
    complexity: 1,
    sogChoice: false,
    riseOfIx: true,
  },
  {
    name: LEADER_NAMES.VISCOUNT_HUDRO_MORITANI,
    ability: {
      name: 'Intelligence',
      description:
        'Game start: look at the top 2 Intrigue cards, keep one (once per game).',
    },
    signetRingText: '1 spice → +1 on shipping track.',
    signetRingTitle: 'Spice → Shipping',
    complexity: 1,
    sogChoice: false,
    riseOfIx: true,
  },
  {
    name: LEADER_NAMES.PRINCESS_YUNA_MORITANI,
    ability: {
      name: 'Spice Royalty',
      description:
        'You start with no water. When you gain Solari on your turn, increase the amount by 1.',
    },
    signetRingText: '7 Solari → +1 influence (choose), +1 spice, +1 troop.',
    signetRingTitle: '7 Solari',
    complexity: 2,
    sogChoice: false,
    riseOfIx: true,
  },
  {
    name: LEADER_NAMES.ARCHDUKE_ARMAND_ECAZ,
    ability: {
      name: "Houses' Confidence",
      description:
        'If you have at least 2 agents on Yellow/Blue/Green spaces upon reveal, you may trash 1 card in play.',
    },
    signetRingText: 'You may acquire a card that costs 3 or less.',
    signetRingTitle: 'Free 3-cost acquire',
    complexity: 2,
    sogChoice: false,
    riseOfIx: true,
  },
  {
    name: LEADER_NAMES.ILESA_ECAZ,
    ability: {
      name: 'Hidden Pact',
      description:
        'Round start: set a card aside. When played on your 2nd turn: +1 Solari, or if only 1 agent icon +1 spice.',
    },
    signetRingText: '1 Solari → 1 Foldspace card.',
    signetRingTitle: 'Free Foldspace',
    complexity: 3,
    sogChoice: false,
    riseOfIx: true,
  },
  {
    name: LEADER_NAMES.TESSIA_VERNIUS,
    ability: {
      name: 'Subtle Subterfuge',
      description: 'Place snooper tokens on influence tracks.',
    },
    signetRingText:
      '−1 influence (choose) → +1 influence with a faction where you have a snooper token.',
    signetRingTitle: 'Influence steal',
    complexity: 4,
    sogChoice: false,
    riseOfIx: true,
  },
]

export function getLeaderPool(expansions: Expansions): Leader[] {
  return expansions.riseOfIx ? [...LEADERS, ...RISE_OF_IX_LEADERS] : LEADERS
}
