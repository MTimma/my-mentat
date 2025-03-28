import { SpaceProps, AgentIcon, FactionType } from '../types/GameTypes'

export const boardSpaces: SpaceProps[] = [
  // City Spaces
  {
    id: 1,
    name: "Arrakeen",
    conflictMarker: true,
    agentIcon: AgentIcon.CITY,
    reward: { troops: 1, cards: 1 },
    controlBonus: 'solari'
  },
  {
    id: 2,
    name: "Carthag",
    conflictMarker: true,
    agentIcon: AgentIcon.CITY,
    reward: { troops: 1, intrigueCards: 1 },
    controlBonus: 'solari'
  },
  {
    id: 3,
    name: "Research Station",
    conflictMarker: true,
    agentIcon: AgentIcon.CITY,
    cost: { water: 2 },
    reward: { cards: 3 }
  },

  // Spice Trade Spaces
  {
    id: 4,
    name: "Imperial Basin",
    conflictMarker: true,
    agentIcon: AgentIcon.SPICE_TRADE,
    reward: { spice: 1 },
    bonusSpice: 0,
    controlBonus: 'spice'
  },
  {
    id: 5,
    name: "The Great Flat",
    conflictMarker: true,
    agentIcon: AgentIcon.SPICE_TRADE,
    cost: { water: 2 },
    reward: { spice: 3 },
    bonusSpice: 0
  },
  {
    id: 6,
    name: "Hagga Basin",
    conflictMarker: true,
    agentIcon: AgentIcon.SPICE_TRADE,
    cost: { water: 1 },
    reward: { spice: 2 },
    bonusSpice: 0
  },
  {
    id: 7,
    name: "Secure Contract",
    conflictMarker: false,
    agentIcon: AgentIcon.SPICE_TRADE,
    reward: { solari: 3 }
  },
  {
    id: 8,
    name: "Sell Melange",
    conflictMarker: false,
    agentIcon: AgentIcon.SPICE_TRADE,
    cost: { spice: 2 },
    reward: { solari: 0 },
    specialEffect: 'sellMelange'
  },

  // Landsraad Spaces
  {
    id: 9,
    name: "High Council",
    conflictMarker: false,
    agentIcon: AgentIcon.LANDSRAAD,
    cost: { solari: 5 },
    reward: { persuasion: 2 },
    specialEffect: 'highCouncil'
  },
  {
    id: 10,
    name: "Mentat",
    conflictMarker: false,
    agentIcon: AgentIcon.LANDSRAAD,
    cost: { solari: 2 },
    reward: { cards: 1 },
    specialEffect: 'mentat'
  },
  {
    id: 11,
    name: "Rally Troops",
    conflictMarker: false,
    agentIcon: AgentIcon.LANDSRAAD,
    cost: { solari: 4 },
    reward: { troops: 4 }
  },
  {
    id: 12,
    name: "Hall of Oratory",
    conflictMarker: false,
    agentIcon: AgentIcon.LANDSRAAD,
    reward: { persuasion: 1 }
  },
  {
    id: 13,
    name: "Swordmaster",
    conflictMarker: false,
    agentIcon: AgentIcon.LANDSRAAD,
    cost: { solari: 8 },
    specialEffect: 'swordmaster'
  },

  // Faction Spaces
  {
    id: 14,
    name: "Conspire",
    conflictMarker: false,
    agentIcon: AgentIcon.EMPEROR,
    cost: { spice: 4 },
    influence: { faction: FactionType.EMPEROR, amount: 1 },
    reward: { solari: 5, troops: 2, intrigueCards: 1 }
  },
  {
    id: 15,
    name: "Wealth",
    conflictMarker: false,
    agentIcon: AgentIcon.EMPEROR,
    influence: { faction: FactionType.EMPEROR, amount: 1 },
    reward: { solari: 2 }
  },
  {
    id: 16,
    name: "Foldspace",
    conflictMarker: false,
    agentIcon: AgentIcon.SPACING_GUILD,
    influence: { faction: FactionType.SPACING_GUILD, amount: 1 },
    specialEffect: 'foldspace'
  },
  {
    id: 17,
    name: "Heighliner",
    conflictMarker: true,
    agentIcon: AgentIcon.SPACING_GUILD,
    cost: { spice: 6 },
    influence: { faction: FactionType.SPACING_GUILD, amount: 1 },
    reward: { troops: 5, water: 2 }
  },
  {
    id: 18,
    name: "Secrets",
    conflictMarker: false,
    agentIcon: AgentIcon.BENE_GESSERIT,
    influence: { faction: FactionType.BENE_GESSERIT, amount: 1 },
    reward: { intrigueCards: 1 },
    specialEffect: 'secrets'
  },
  {
    id: 19,
    name: "Selective Breeding",
    conflictMarker: false,
    agentIcon: AgentIcon.BENE_GESSERIT,
    cost: { spice: 2 },
    influence: { faction: FactionType.BENE_GESSERIT, amount: 1 },
    specialEffect: 'selectiveBreeding'
  },
  {
    id: 20,
    name: "Hardy Warriors",
    conflictMarker: true,
    agentIcon: AgentIcon.FREMEN,
    cost: { water: 1 },
    influence: { faction: FactionType.FREMEN, amount: 1 },
    reward: { troops: 2 }
  },
  {
    id: 21,
    name: "Sietch Tabr",
    conflictMarker: true,
    agentIcon: AgentIcon.FREMEN,
    requiresInfluence: { faction: FactionType.FREMEN, amount: 2 },
    influence: { faction: FactionType.FREMEN, amount: 1 },
    reward: { troops: 1, water: 1 }
  },
  {
    id: 22,
    name: "Stillsuits",
    conflictMarker: true,
    agentIcon: AgentIcon.FREMEN,
    influence: { faction: FactionType.FREMEN, amount: 1 },
    reward: { water: 1 }
  }
] 