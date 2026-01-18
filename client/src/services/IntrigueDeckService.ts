import { IntrigueCard, IntrigueCardType, FactionType, EffectTiming, GamePhase, CustomEffect, AgentIcon } from '../types/GameTypes'

export const intrigueCards: IntrigueCard[] = [
  // NOTE: These entries are derived from the images in `client/public/intrigue/base/`.
  // Some effects (timing triggers, “choose one”, board-space exceptions, etc.) are not yet modeled by the current intrigue resolution,
  // so they’re captured in `description` but may have partial/empty `playEffect`.
  {
    id: 1,
    name: 'Ambush',
    type: IntrigueCardType.COMBAT,
    description: 'Combat: +4 strength.',
    image: '/intrigue/base/ambush.png',
    agentIcons: [],
    playEffect: [{ reward: { combat: 4 } }]
  },
  {
    id: 2,
    name: 'Allied Armada',
    type: IntrigueCardType.COMBAT,
    description: 'If you have a faction alliance: pay 2 spice to gain +7 strength.',
    image: '/intrigue/base/allied_armada.png',
    agentIcons: [],
    playEffect: [
      {
        requirement: {
          or: [
            { alliance: FactionType.EMPEROR },
            { alliance: FactionType.SPACING_GUILD },
            { alliance: FactionType.BENE_GESSERIT },
            { alliance: FactionType.FREMEN }
          ]
        },
        cost: { spice: 2 },
        reward: { combat: 7 }
      }
    ]
  },
  {
    id: 3,
    name: 'Bindu Suspension',
    type: IntrigueCardType.PLOT,
    description:
      'At the start of your turn: draw 1 card. You may pass your turn (instead of taking an Agent or Reveal turn).',
    image: '/intrigue/base/bindu_suspension.png',
    agentIcons: [],
    playEffect: [{ reward: { drawCards: 1 } }]
  },
  {
    id: 4,
    name: 'Bribery',
    type: IntrigueCardType.PLOT,
    description: 'Pay 2 Solari to gain 1 influence with a faction of your choice.',
    image: '/intrigue/base/bribery.png',
    agentIcons: [],
    playEffect: [{ cost: { solari: 2 }, reward: {} }]
  },
  {
    id: 5,
    name: 'Bypass Protocol',
    type: IntrigueCardType.PLOT,
    description:
      'Acquire a card that costs 3 or less —OR— pay 2 spice to acquire a card that costs 5 or less to the top of your deck.',
    image: '/intrigue/base/bypass_protocol.png',
    agentIcons: [],
    playEffect: [{ reward: { custom: CustomEffect.BYPASS_PROTOCOL } }]
  },
  {
    id: 6,
    name: 'Calculated Hire',
    type: IntrigueCardType.PLOT,
    description: 'Pay 1 spice to take the Mentat from its designated space in the Landsraad.',
    image: '/intrigue/base/calculated_hire.png',
    agentIcons: [],
    playEffect: [{ cost: { spice: 1 }, reward: { custom: CustomEffect.CALCULATED_HIRE } }]
  },
  {
    id: 7,
    name: 'Charisma',
    type: IntrigueCardType.PLOT,
    description: 'Gain 2 persuasion during your Reveal turn this round.',
    image: '/intrigue/base/charisma.png',
    agentIcons: [],
    playEffect: [{ timing: EffectTiming.ON_REVEAL_THIS_ROUND, reward: { persuasion: 2 } }]
  },
  {
    id: 8,
    name: 'CHOAM Shares',
    type: IntrigueCardType.PLOT,
    description: 'Pay 7 Solari to gain 1 VP.',
    image: '/intrigue/base/choam_shares.png',
    agentIcons: [],
    playEffect: [{ cost: { solari: 7 }, reward: { victoryPoints: 1 } }]
  },
  {
    id: 9,
    name: 'Corner the Market',
    type: IntrigueCardType.ENDGAME,
    description:
      'Endgame: If you have at least two The Spice Must Flow, gain 1 VP. If you have more The Spice Must Flow than each opponent, gain 1 VP.',
    image: '/intrigue/base/corner_the_market.png',
    agentIcons: [],
    playEffect: [{ phase: GamePhase.END_GAME, reward: { custom: CustomEffect.CORNER_THE_MARKET } }]
  },
  {
    id: 10,
    name: 'Councilor’s Dispensation',
    type: IntrigueCardType.PLOT,
    description: 'If you have a seat on the High Council: gain 2 spice.',
    image: '/intrigue/base/councilors_dispensation.png',
    agentIcons: [],
    playEffect: [{ reward: { spice: 2 } }]
  },
  {
    id: 11,
    name: 'Dispatch an Envoy',
    type: IntrigueCardType.PLOT,
    description: 'The card you play this turn has the following icons: Landsraad, Fremen, Bene Gesserit, Spacing Guild.',
    image: '/intrigue/base/dispatch_an_envoy.png',
    agentIcons: [],
    // Adds Landsraad, Fremen, Bene Gesserit, and Spacing Guild icons to the next card played this turn
    playEffect: [{ reward: { custom: CustomEffect.DISPATCH_AN_ENVOY } }]
  },
  {
    id: 12,
    name: 'Double Cross',
    type: IntrigueCardType.PLOT,
    description:
      'An opponent of your choice loses 1 troop in the Conflict and you deploy 1 troop from your supply to the Conflict.',
    image: '/intrigue/base/double_cross.png',
    agentIcons: [],
    targetPlayer: true,
    playEffect: [{ reward: { custom: CustomEffect.DOUBLE_CROSS } }]
  },
  {
    id: 13,
    name: 'Favored Subject',
    type: IntrigueCardType.PLOT,
    description: 'Gain 1 influence with the Emperor.',
    image: '/intrigue/base/favored_subject.png',
    agentIcons: [],
    playEffect: [{ reward: { influence: { amounts: [{ faction: FactionType.EMPEROR, amount: 1 }] } } }]
  },
  {
    id: 14,
    name: 'Guild Authorization',
    type: IntrigueCardType.PLOT,
    description: 'Gain 1 influence with the Spacing Guild.',
    image: '/intrigue/base/guild_authorization.png',
    agentIcons: [],
    playEffect: [{ reward: { influence: { amounts: [{ faction: FactionType.SPACING_GUILD, amount: 1 }] } } }]
  },
  {
    id: 15,
    name: 'Infiltrate',
    type: IntrigueCardType.PLOT,
    description: 'Enemy Agents don’t block your next Agent at board spaces this turn.',
    image: '/intrigue/base/infiltrate.png',
    agentIcons: [],
    playEffect: [{ reward: { custom: CustomEffect.INFILTRATE } }]
  },
  {
    id: 16,
    name: 'Know Their Ways',
    type: IntrigueCardType.PLOT,
    description: 'Gain 1 influence with the Fremen.',
    image: '/intrigue/base/know_their_ways.png',
    agentIcons: [],
    playEffect: [{ reward: { influence: { amounts: [{ faction: FactionType.FREMEN, amount: 1 }] } } }]
  },
  {
    id: 17,
    name: 'Master Tactician',
    type: IntrigueCardType.COMBAT,
    description: 'Combat: +3 strength —OR— Retreat up to three of your troops.',
    image: '/intrigue/base/master_tactitian.png',
    agentIcons: [],
    playEffect: [{ reward: { combat: 3 } }]
  },
  {
    id: 18,
    name: 'Plans Within Plans',
    type: IntrigueCardType.ENDGAME,
    description:
      'Endgame: If you have 3+ influence on three faction tracks, gain 1 VP —OR— if you have 3+ influence on four faction tracks, gain 2 VP.',
    image: '/intrigue/base/plans_within_plans.png',
    agentIcons: [],
    playEffect: [{ phase: GamePhase.END_GAME, reward: { custom: CustomEffect.PLANS_WITHIN_PLANS } }]
  },
  {
    id: 19,
    name: 'Private Army',
    type: IntrigueCardType.COMBAT,
    description: 'Pay 2 spice to gain +5 strength.',
    image: '/intrigue/base/private_army.png',
    agentIcons: [],
    playEffect: [{ cost: { spice: 2 }, reward: { combat: 5 } }]
  },
  {
    id: 20,
    name: 'Rapid Mobilization',
    type: IntrigueCardType.PLOT,
    description: 'Deploy any number of your garrisoned troops to the Conflict.',
    image: '/intrigue/base/rapid_mobilization.png',
    agentIcons: [],
    playEffect: [{ reward: { custom: CustomEffect.RAPID_MOBILIZATION } }]
  },
  {
    id: 21,
    name: 'Recruitment Mission',
    type: IntrigueCardType.PLOT,
    description:
      'Gain 1 water during your Reveal turn this round. You may put cards you acquire on top of your deck.',
    image: '/intrigue/base/recruitment_mission.png',
    agentIcons: [],
    playEffect: [
      { timing: EffectTiming.ON_REVEAL_THIS_ROUND, reward: { water: 1 } },
      { reward: { acquireToTopThisRound: true } }
    ]
  },
  {
    id: 22,
    name: 'Refocus',
    type: IntrigueCardType.PLOT,
    description: 'Shuffle your discard pile into your deck, then draw 1 card.',
    image: '/intrigue/base/refocus.png',
    agentIcons: [],
    playEffect: [{ reward: { drawCards: 1 } }]
  },
  {
    id: 23,
    name: 'Reinforcements',
    type: IntrigueCardType.PLOT,
    description: 'Gain 3 troops. If it’s your Reveal turn, you may deploy any of these troops to the Conflict.',
    image: '/intrigue/base/reinforcements.png',
    agentIcons: [],
    playEffect: [{ reward: { troops: 3 } }]
  },
  {
    id: 24,
    name: 'Secret of the Sisterhood',
    type: IntrigueCardType.PLOT,
    description: 'Gain 1 influence with the Bene Gesserit.',
    image: '/intrigue/base/secret_of_the_sisterhood.png',
    agentIcons: [],
    playEffect: [{ reward: { influence: { amounts: [{ faction: FactionType.BENE_GESSERIT, amount: 1 }] } } }]
  },
  {
    id: 25,
    name: 'Staged Incident',
    type: IntrigueCardType.COMBAT,
    description: 'Lose three of your troops in the Conflict to gain 1 VP.',
    image: '/intrigue/base/staged_incident.png',
    agentIcons: [],
    playEffect: [{ reward: { victoryPoints: 1 } }]
  },
  {
    id: 26,
    name: 'The Sleeper Must Awaken',
    type: IntrigueCardType.PLOT,
    description: 'Pay 4 spice to gain 1 VP.',
    image: '/intrigue/base/the_sleeper_must_awaken.png',
    agentIcons: [],
    playEffect: [{ cost: { spice: 4 }, reward: { victoryPoints: 1 } }]
  },
  {
    id: 27,
    name: 'Tiebreaker',
    type: IntrigueCardType.COMBAT,
    description: 'Combat: +2 strength —OR— Endgame: counts as 10 spice for tiebreakers.',
    image: '/intrigue/base/tiebraker.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.COMBAT, reward: { combat: 2 } },
      { phase: GamePhase.END_GAME, reward: { tiebreakerSpice: 10 } }
    ]
  },
  {
    id: 28,
    name: 'To the Victor…',
    type: IntrigueCardType.COMBAT,
    description: 'When you win a Conflict: gain 3 spice.',
    image: '/intrigue/base/to_the_victor.png',
    agentIcons: [],
    playEffect: [{ reward: { spice: 3 } }]
  },
  {
    id: 29,
    name: 'Urgent Mission',
    type: IntrigueCardType.PLOT,
    description: 'Recall one of your Agents.',
    image: '/intrigue/base/urgent_mission.png',
    agentIcons: [],
    playEffect: [{ reward: { custom: CustomEffect.URGENT_MISSION } }]
  },
  {
    id: 30,
    name: 'Water of Life',
    type: IntrigueCardType.PLOT,
    description: 'Pay 1 water and 1 spice to draw 3 cards.',
    image: '/intrigue/base/water_of_life.png',
    agentIcons: [],
    playEffect: [{ cost: { water: 1, spice: 1 }, reward: { drawCards: 3 } }]
  },
  {
    id: 31,
    name: 'Water Peddlers Union',
    type: IntrigueCardType.PLOT,
    description: 'Gain 1 water.',
    image: '/intrigue/base/water_peddlers_union.png',
    agentIcons: [],
    playEffect: [{ reward: { water: 1 } }]
  },
  {
    id: 32,
    name: 'Windfall',
    type: IntrigueCardType.PLOT,
    description: 'Gain 2 Solari.',
    image: '/intrigue/base/windfall.png',
    agentIcons: [],
    playEffect: [{ reward: { solari: 2 } }]
  }
]

export class IntrigueDeckService {
  private deck: IntrigueCard[]
  private discardPile: IntrigueCard[]

  constructor() {
    this.deck = [...intrigueCards]
    this.discardPile = []
    this.shuffle()
  }

  private shuffle(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]
    }
  }

  drawCard(): IntrigueCard | null {
    if (this.deck.length === 0) {
      if (this.discardPile.length === 0) return null
      this.deck = [...this.discardPile]
      this.discardPile = []
      this.shuffle()
    }
    return this.deck.pop() || null
  }

  discardCard(card: IntrigueCard): void {
    this.discardPile.push(card)
  }

  getDeckSize(): number {
    return this.deck.length
  }

  getDiscardSize(): number {
    return this.discardPile.length
  }
} 