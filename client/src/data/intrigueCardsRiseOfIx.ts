import {
  CustomEffect,
  FactionType,
  GamePhase,
  IntrigueCard,
  IntrigueCardType,
  type InfluenceAmounts,
} from '../types/GameTypes'

const LOSE_ONE_INFLUENCE_CHOOSE: InfluenceAmounts = {
  chooseOne: true,
  amounts: [
    { faction: FactionType.EMPEROR, amount: -1 },
    { faction: FactionType.SPACING_GUILD, amount: -1 },
    { faction: FactionType.BENE_GESSERIT, amount: -1 },
    { faction: FactionType.FREMEN, amount: -1 },
  ],
}

const GAIN_ONE_INFLUENCE_CHOOSE: InfluenceAmounts = {
  chooseOne: true,
  amounts: [
    { faction: FactionType.EMPEROR, amount: 1 },
    { faction: FactionType.SPACING_GUILD, amount: 1 },
    { faction: FactionType.BENE_GESSERIT, amount: 1 },
    { faction: FactionType.FREMEN, amount: 1 },
  ],
}

/** Rise of Ix — 17 intrigue cards (ids 33–49). */
export const RISE_OF_IX_INTRIGUE_CARDS: IntrigueCard[] = [
  {
    id: 33,
    name: 'Blackmail',
    type: IntrigueCardType.COMBAT,
    description: 'Combat: Lose 1 influence (your choice) to gain +5 strength.',
    image: '/intrigue/rise_of_ix/blackmail.png',
    agentIcons: [],
    playEffect: [
      {
        phase: GamePhase.COMBAT,
        cost: { influence: LOSE_ONE_INFLUENCE_CHOOSE },
        reward: { combat: 5 },
      },
    ],
  },
  {
    id: 34,
    name: 'Cannon Turrets',
    type: IntrigueCardType.COMBAT,
    description: 'Combat: +2 strength. Each opponent retreats 1 dreadnought from the Conflict.',
    image: '/intrigue/rise_of_ix/cannon_turrets.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.COMBAT, reward: { combat: 2 } },
      { phase: GamePhase.COMBAT, reward: { custom: CustomEffect.CANNON_TURRETS } },
    ],
  },
  {
    id: 35,
    name: 'Strategic Push',
    type: IntrigueCardType.COMBAT,
    description: 'Combat: +2 strength. If you win this Conflict: +2 Solari.',
    image: '/intrigue/rise_of_ix/strategic_push.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.COMBAT, reward: { combat: 2 } },
      { phase: GamePhase.COMBAT, reward: { custom: CustomEffect.STRATEGIC_PUSH } },
    ],
  },
  {
    id: 36,
    name: 'Second Wave',
    type: IntrigueCardType.COMBAT,
    description: 'Combat: +2 strength. Deploy up to 2 units from your garrison to the Conflict.',
    image: '/intrigue/rise_of_ix/second_wave.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.COMBAT, reward: { combat: 2 } },
      { phase: GamePhase.COMBAT, reward: { custom: CustomEffect.SECOND_WAVE } },
    ],
  },
  {
    id: 37,
    name: 'War Chest',
    type: IntrigueCardType.COMBAT,
    description:
      'Combat: Pay 2 Solari to gain +4 strength —OR— Endgame: If you have 10+ Solari, gain 1 VP.',
    image: '/intrigue/rise_of_ix/war_chest.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.COMBAT, cost: { solari: 2 }, reward: { combat: 4 } },
      { phase: GamePhase.END_GAME, reward: { custom: CustomEffect.WAR_CHEST } },
    ],
  },
  {
    id: 38,
    name: 'Finesse',
    type: IntrigueCardType.COMBAT,
    description:
      'Combat: +2 strength —OR— Plot: Lose 1 influence (your choice) to gain 1 influence (your choice).',
    image: '/intrigue/rise_of_ix/finesse.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.COMBAT, reward: { combat: 2 } },
      {
        phase: GamePhase.PLAYER_TURNS,
        cost: { influence: LOSE_ONE_INFLUENCE_CHOOSE },
        reward: { influence: GAIN_ONE_INFLUENCE_CHOOSE },
      },
    ],
  },
  {
    id: 39,
    name: 'Advanced Weaponry',
    type: IntrigueCardType.COMBAT,
    description:
      'Combat: If you have 3 tech: +4 strength —OR— Plot: Pay 3 Solari to commission 1 dreadnought.',
    image: '/intrigue/rise_of_ix/advanced_weaponry.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.COMBAT, reward: { custom: CustomEffect.ADVANCED_WEAPONRY } },
      { phase: GamePhase.PLAYER_TURNS, cost: { solari: 3 }, reward: { dreadnoughts: 1 } },
    ],
  },
  {
    id: 40,
    name: 'Grand Conspiracy',
    type: IntrigueCardType.ENDGAME,
    description:
      'Endgame: If you meet 3 of 4 conditions (2 dreadnoughts, 1 SMF, 4+ influence on 2 tracks, High Council): 1 VP. All 4: 2 VP.',
    image: '/intrigue/rise_of_ix/grand_conspiracy.png',
    agentIcons: [],
    playEffect: [{ phase: GamePhase.END_GAME, reward: { custom: CustomEffect.GRAND_CONSPIRACY } }],
  },
  {
    id: 41,
    name: 'Strongarm',
    type: IntrigueCardType.PLOT,
    description: 'Lose a troop to gain 1 influence on the faction track where you placed an Agent this turn.',
    image: '/intrigue/rise_of_ix/strongarm.png',
    agentIcons: [],
    playEffect: [{ cost: { troops: 1 }, reward: { custom: CustomEffect.STRONGARM } }],
  },
  {
    id: 42,
    name: 'Ixian Probe',
    type: IntrigueCardType.PLOT,
    description: 'Discard 2 cards to draw 2 cards.',
    image: '/intrigue/rise_of_ix/ixian_probe.png',
    agentIcons: [],
    playEffect: [{ cost: { discard: 2 }, reward: { drawCards: 2 } }],
  },
  {
    id: 43,
    name: 'Cull',
    type: IntrigueCardType.PLOT,
    description: 'Pay 1 Solari to trash 1 card.',
    image: '/intrigue/rise_of_ix/cull.png',
    agentIcons: [],
    playEffect: [{ cost: { solari: 1 }, reward: { trash: 1 } }],
  },
  {
    id: 44,
    name: 'Secret Forces',
    type: IntrigueCardType.PLOT,
    description: 'Gain 2 troops if you have a seat on the High Council.',
    image: '/intrigue/rise_of_ix/secret_forces.png',
    agentIcons: [],
    playEffect: [{ requirement: { highCouncil: true }, reward: { troops: 2 } }],
  },
  {
    id: 45,
    name: 'Quid Pro Quo',
    type: IntrigueCardType.PLOT,
    description:
      'Pay 2 spice to gain 1 influence on each faction track where you currently have an Agent.',
    image: '/intrigue/rise_of_ix/quid_pro_quo.png',
    agentIcons: [],
    playEffect: [{ cost: { spice: 2 }, reward: { custom: CustomEffect.QUID_PRO_QUO } }],
  },
  {
    id: 46,
    name: 'Glimpse the Path',
    type: IntrigueCardType.PLOT,
    description: 'Pay 1 spice to gain 1 water and draw 1 card.',
    image: '/intrigue/rise_of_ix/glimpse_the_path.png',
    agentIcons: [],
    playEffect: [{ cost: { spice: 1 }, reward: { water: 1, drawCards: 1 } }],
  },
  {
    id: 47,
    name: 'Diversion',
    type: IntrigueCardType.PLOT,
    description: 'When you deploy 4 units to the Conflict in one turn, gain +1 on the Shipping track.',
    image: '/intrigue/rise_of_ix/diversion.png',
    agentIcons: [],
    playEffect: [{ reward: { custom: CustomEffect.DIVERSION } }],
  },
  {
    id: 48,
    name: 'Expedite',
    type: IntrigueCardType.PLOT,
    description: 'Pay 1 spice to advance 1 space on the Shipping track.',
    image: '/intrigue/rise_of_ix/expedite.png',
    agentIcons: [],
    playEffect: [{ cost: { spice: 1 }, reward: { freighter: 1 } }],
  },
  {
    id: 49,
    name: 'Machine Culture',
    type: IntrigueCardType.PLOT,
    description: 'Plot: Acquire 1 tech tile —OR— Endgame: If you have 3 tech: gain 1 VP.',
    image: '/intrigue/rise_of_ix/machine_culture.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.PLAYER_TURNS, reward: { acquireTech: {} } },
      { phase: GamePhase.END_GAME, reward: { custom: CustomEffect.MACHINE_CULTURE } },
    ],
  },
]
