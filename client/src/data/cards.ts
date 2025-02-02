import { Card, AgentIcon } from '../types/GameTypes'

export const STARTING_CARDS: Card[] = [
  {
    id: 1,
    name: "Convincing Argument",
    persuasion: 2,
    agentIcons: [],
    effect: "Reveal: Gain 2 persuasion"
  },
  {
    id: 2,
    name: "Convincing Argument",
    persuasion: 2,
    agentIcons: [],
    effect: "Reveal: Gain 2 persuasion"
  },
  {
    id: 3,
    name: "Dagger",
    swordIcon: true,
    agentIcons: [AgentIcon.LANDSRAAD],
    effect: "Reveal: Add 1 combat strength"
  },
  {
    id: 4,
    name: "Dagger",
    swordIcon: true,
    agentIcons: [AgentIcon.LANDSRAAD],
    effect: "Reveal: Add 1 combat strength"
  },
  {
    id: 5,
    name: "Diplomacy",
    persuasion: 1,
    agentIcons: [
      AgentIcon.FREMEN,
      AgentIcon.BENE_GESSERIT,
      AgentIcon.SPACING_GUILD,
      AgentIcon.EMPEROR
    ],
    effect: "Reveal: Gain 1 persuasion"
  },
  {
    id: 6,
    name: "Dune, the Desert Planet",
    persuasion: 1,
    agentIcons: [AgentIcon.SPICE_TRADE],
    effect: "Reveal: Gain 1 persuasion"
  },
  {
    id: 7,
    name: "Dune, the Desert Planet",
    persuasion: 1,
    agentIcons: [AgentIcon.SPICE_TRADE],
    effect: "Reveal: Gain 1 persuasion"
  },
  {
    id: 8,
    name: "Reconnaissance",
    persuasion: 1,
    agentIcons: [AgentIcon.CITY],
    effect: "Reveal: Gain 1 persuasion"
  },
  {
    id: 9,
    name: "Seek Allies",
    agentIcons: [
      AgentIcon.FREMEN,
      AgentIcon.BENE_GESSERIT,
      AgentIcon.SPACING_GUILD,
      AgentIcon.EMPEROR
    ],
    effect: "Play: Trash this card"
  },
  {
    id: 10,
    name: "Signet Ring",
    persuasion: 1,
    agentIcons: [
      AgentIcon.LANDSRAAD,
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE
    ],
    effect: "Play: Use your leader's Signet Ring ability\nReveal: Gain 1 persuasion"
  }
] 