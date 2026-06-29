import {
  CustomEffect,
  GamePhase,
  IntrigueCard,
  IntrigueCardType,
} from '../types/GameTypes'

/**
 * Immortality — 15 intrigue cards (ids 50–64). 11 unique designs; Harvest Cells,
 * Vicious Talents, Gruesome Sacrifice and Illicit Dealings appear twice.
 * Text paraphrased from `.cursor/immortality` — verify against printed cards.
 */
export const IMMORTALITY_INTRIGUE_CARDS: IntrigueCard[] = [
  {
    id: 50,
    name: 'Harvest Cells',
    type: IntrigueCardType.COMBAT,
    description:
      'Combat: When you lose 3+ troops at the end of a Conflict: +2 specimen. You may also acquire a Tleilaxu card (paying its normal cost).',
    image: '/intrigue/immortality/harvest_cells.png',
    agentIcons: [],
    playEffect: [{ phase: GamePhase.COMBAT, reward: { custom: CustomEffect.HARVEST_CELLS } }],
  },
  {
    id: 51,
    name: 'Harvest Cells',
    type: IntrigueCardType.COMBAT,
    description:
      'Combat: When you lose 3+ troops at the end of a Conflict: +2 specimen. You may also acquire a Tleilaxu card (paying its normal cost).',
    image: '/intrigue/immortality/harvest_cells.png',
    agentIcons: [],
    playEffect: [{ phase: GamePhase.COMBAT, reward: { custom: CustomEffect.HARVEST_CELLS } }],
  },
  {
    id: 52,
    name: 'Vicious Talents',
    type: IntrigueCardType.COMBAT,
    description:
      'Combat: +2 strength. If research lvl 1: +2 more. If research lvl 2: +2 more (2–6 strength).',
    image: '/intrigue/immortality/vicious_talents.png',
    agentIcons: [],
    playEffect: [{ phase: GamePhase.COMBAT, reward: { custom: CustomEffect.VICIOUS_TALENTS } }],
  },
  {
    id: 53,
    name: 'Vicious Talents',
    type: IntrigueCardType.COMBAT,
    description:
      'Combat: +2 strength. If research lvl 1: +2 more. If research lvl 2: +2 more (2–6 strength).',
    image: '/intrigue/immortality/vicious_talents.png',
    agentIcons: [],
    playEffect: [{ phase: GamePhase.COMBAT, reward: { custom: CustomEffect.VICIOUS_TALENTS } }],
  },
  {
    id: 54,
    name: 'Gruesome Sacrifice',
    type: IntrigueCardType.COMBAT,
    description: 'Combat: Lose 2 of your troops in the Conflict to gain +2 specimen and +1 beetle.',
    image: '/intrigue/immortality/gruesome_sacrificee.png',
    agentIcons: [],
    playEffect: [
      {
        phase: GamePhase.COMBAT,
        cost: { troops: 2 },
        reward: { specimen: 2, tleilaxu: 1, custom: CustomEffect.GRUESOME_SACRIFICE },
      },
    ],
  },
  {
    id: 55,
    name: 'Gruesome Sacrifice',
    type: IntrigueCardType.COMBAT,
    description: 'Combat: Lose 2 of your troops in the Conflict to gain +2 specimen and +1 beetle.',
    image: '/intrigue/immortality/gruesome_sacrificee.png',
    agentIcons: [],
    playEffect: [
      {
        phase: GamePhase.COMBAT,
        cost: { troops: 2 },
        reward: { specimen: 2, tleilaxu: 1, custom: CustomEffect.GRUESOME_SACRIFICE },
      },
    ],
  },
  {
    id: 56,
    name: 'Breakthrough',
    type: IntrigueCardType.PLOT,
    description: 'Plot: +1 research.',
    image: '/intrigue/immortality/breakthrough.png',
    agentIcons: [],
    playEffect: [{ reward: { research: 1 } }],
  },
  {
    id: 57,
    name: 'Illicit Dealings',
    type: IntrigueCardType.PLOT,
    description: 'Plot: +1 beetle (advance on the Tleilaxu track).',
    image: '/intrigue/immortality/illicit_dealings.png',
    agentIcons: [],
    playEffect: [{ reward: { tleilaxu: 1 } }],
  },
  {
    id: 58,
    name: 'Illicit Dealings',
    type: IntrigueCardType.PLOT,
    description: 'Plot: +1 beetle (advance on the Tleilaxu track).',
    image: '/intrigue/immortality/illicit_dealings.png',
    agentIcons: [],
    playEffect: [{ reward: { tleilaxu: 1 } }],
  },
  {
    id: 59,
    name: 'Disguised Bureaucrat',
    type: IntrigueCardType.PLOT,
    description:
      'Plot: If research lvl 1: +1 spice. If research lvl 2: +1 influence (your choice).',
    image: '/intrigue/immortality/disguised_beaurocrat.png',
    agentIcons: [],
    playEffect: [{ reward: { custom: CustomEffect.DISGUISED_BUREAUCRAT } }],
  },
  {
    id: 60,
    name: 'Shadowy Bargain',
    type: IntrigueCardType.PLOT,
    description: 'Plot: +1 specimen —OR— Endgame: +1 beetle (advance on the Tleilaxu track).',
    image: '/intrigue/immortality/shadowy_bargain.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.PLAYER_TURNS, reward: { specimen: 1 } },
      { phase: GamePhase.END_GAME, reward: { tleilaxu: 1 } },
    ],
  },
  {
    id: 61,
    name: 'Tleilaxu Puppet',
    type: IntrigueCardType.PLOT,
    description:
      'Plot: +1 persuasion this round —OR— Endgame: If you have a High Council seat and research lvl 2: +1 VP.',
    image: '/intrigue/immortality/tleilaxu_puppet.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.PLAYER_TURNS, reward: { persuasion: 1 } },
      { phase: GamePhase.END_GAME, reward: { custom: CustomEffect.TLEILAXU_PUPPET } },
    ],
  },
  {
    id: 62,
    name: 'Study Melange',
    type: IntrigueCardType.PLOT,
    description: 'Plot: +1 spice —OR— Endgame: If you have 3 spice and research lvl 2: +1 VP.',
    image: '/intrigue/immortality/study_melange.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.PLAYER_TURNS, reward: { spice: 1 } },
      { phase: GamePhase.END_GAME, reward: { custom: CustomEffect.STUDY_MELANGE } },
    ],
  },
  {
    id: 63,
    name: 'Counterattack',
    type: IntrigueCardType.COMBAT,
    description:
      'Plot: Deploy up to 2 troops from your garrison —OR— Combat: If an opponent played a combat intrigue: +4 strength.',
    image: '/intrigue/immortality/counterattack.png',
    agentIcons: [],
    playEffect: [
      { phase: GamePhase.PLAYER_TURNS, reward: { custom: CustomEffect.COUNTERATTACK } },
      { phase: GamePhase.COMBAT, reward: { custom: CustomEffect.COUNTERATTACK } },
    ],
  },
  {
    id: 64,
    name: 'Economic Positioning',
    type: IntrigueCardType.PLOT,
    description:
      'Plot: Retreat 2 troops to gain +3 Solari —OR— Endgame: If you have 10 Solari: +1 VP.',
    image: '/intrigue/immortality/economic_positioning.png',
    agentIcons: [],
    playEffect: [
      {
        phase: GamePhase.PLAYER_TURNS,
        cost: { retreatTroops: 2 },
        reward: { solari: 3 },
      },
      { phase: GamePhase.END_GAME, reward: { custom: CustomEffect.ECONOMIC_POSITIONING_IMM } },
    ],
  },
]
