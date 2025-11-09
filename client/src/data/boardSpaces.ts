import { SpaceProps, AgentIcon, FactionType, ControlMarkerType, MakerSpace, CustomEffect } from '../types/GameTypes'

export const BOARD_SPACES: SpaceProps[] = [

  {
    id: 9,
    name: "High Council",
    conflictMarker: false,
    agentIcon: AgentIcon.LANDSRAAD,
    cost: { solari: 5 },
    effects: [{ reward: { persuasion: 2 } }],
    specialEffect: 'highCouncil',
    image: "board/high_council.png"
  },

  {
    id: 12,
    name: "Hall of Oratory",
    conflictMarker: false,
    agentIcon: AgentIcon.LANDSRAAD,
    effects: [{ reward: { troops: 1, persuasion: 1 } }],
    image: "board/hall_of_oratory.png"
  },
  {
    id: 8,
    name: "Sell Melange",
    conflictMarker: false,
    agentIcon: AgentIcon.SPICE_TRADE,
    cost: { spice: 2 },
    image: "board/sell_melange.png"
  },
   {
      id: 15,
      name: "Wealth",
      conflictMarker: false,
      agentIcon: AgentIcon.EMPEROR,
      influence: { faction: FactionType.EMPEROR, amount: 1 },
      effects: [{ reward: { solari: 2 } }],
      image: "board/wealth.png"
    },
    {
      id: 14,
      name: "Conspire",
      conflictMarker: false,
      agentIcon: AgentIcon.EMPEROR,
      cost: { spice: 4 },
      influence: { faction: FactionType.EMPEROR, amount: 1 },
      effects: [{ reward: { solari: 5, troops: 2, intrigueCards: 1 } }],
      image: "board/conspire.png"
    },

    {
      id: 10,
      name: "Mentat",
      conflictMarker: false,
      agentIcon: AgentIcon.LANDSRAAD,
      cost: { solari: 2 },
      effects: [{ reward: { drawCards: 1 } }],
      specialEffect: 'mentat',
      image: "board/mentat.png"
    },
    {
      id: 11,
      name: "Rally Troops",
      conflictMarker: false,
      agentIcon: AgentIcon.LANDSRAAD,
      cost: { solari: 4 },
      effects: [{ reward: { troops: 4 } }],
      image: "board/rally_troops.png"
    },
    {
      id: 13,
      name: "Swordmaster",
      conflictMarker: false,
      agentIcon: AgentIcon.LANDSRAAD,
      cost: { solari: 8 },
      specialEffect: 'swordmaster',
      image: "board/swordmaster.png"
    },




  {
    id: 16,
    name: "Foldspace",
    conflictMarker: false,
    agentIcon: AgentIcon.SPACING_GUILD,
    influence: { faction: FactionType.SPACING_GUILD, amount: 1 },
    specialEffect: 'foldspace',
    image: "board/foldspace.png"
  },
  {
    id: 17,
    name: "Heighliner",
    conflictMarker: true,
    agentIcon: AgentIcon.SPACING_GUILD,
    cost: { spice: 6 },
    influence: { faction: FactionType.SPACING_GUILD, amount: 1 },
    effects: [{ reward: { troops: 5, water: 2 } }],
    image: "board/heighliner.png"
  },

  {
    id: 21,
    name: "Sietch Tabr",
    conflictMarker: true,
    agentIcon: AgentIcon.FREMEN,
    requiresInfluence: { faction: FactionType.FREMEN, amount: 2 },
    influence: { faction: FactionType.FREMEN, amount: 1 },
    effects: [{ reward: { troops: 1, water: 1 } }],
    image: "board/sietch_tabr.png"
  },
  {
    id: 3,
    name: "Research Station",
    conflictMarker: true,
    agentIcon: AgentIcon.CITY,
    cost: { water: 2 },
    effects: [{ reward: { drawCards: 3 } }],
    image: "board/research_station.png"
  },
  {
    id: 7,
    name: "Secure Contract",
    conflictMarker: false,
    agentIcon: AgentIcon.SPICE_TRADE,
    effects: [{ reward: { solari: 3 } }],
    image: "board/secure_contract.png"
  },

  {
    id: 18,
    name: "Secrets",
    conflictMarker: false,
    agentIcon: AgentIcon.BENE_GESSERIT,
    influence: { faction: FactionType.BENE_GESSERIT, amount: 1 },
    effects: [
      { reward: { intrigueCards: 1 } },
      { reward: { custom: CustomEffect.SECRETS_STEAL } }
    ],
    specialEffect: 'secrets',
    image: "board/secrets.png"
  },
  {
    id: 19,
    name: "Selective Breeding",
    conflictMarker: false,
    agentIcon: AgentIcon.BENE_GESSERIT,
    cost: { spice: 2 },
    influence: { faction: FactionType.BENE_GESSERIT, amount: 1 },
    specialEffect: 'selectiveBreeding',
    image: "board/selective_breeding.png"
  },
  {
    id: 1,
    name: "Arrakeen",
    conflictMarker: true,
    agentIcon: AgentIcon.CITY,
    effects: [{ reward: { troops: 1, drawCards: 1 } }],
    controlBonus: { solari: 1 },
    controlMarker: ControlMarkerType.ARRAKIN,
    image: "board/arrakeen.png"
  },
  {
    id: 2,
    name: "Carthag",
    conflictMarker: true,
    agentIcon: AgentIcon.CITY,
    effects: [{ reward: { troops: 1, intrigueCards: 1 } }],
    controlBonus: { solari: 1 },
    controlMarker: ControlMarkerType.CARTHAG,
    image: "board/carthag.png"
  },
  {
    id: 4,
    name: "Imperial Basin",
    conflictMarker: true,
    agentIcon: AgentIcon.SPICE_TRADE,
    effects: [{ reward: { spice: 1 } }],
    controlBonus: { spice: 1 },
    controlMarker: ControlMarkerType.IMPERIAL_BASIN,
    makerSpace: MakerSpace.IMPERIAL_BASIN,
    image: "board/imperial_basin.png"
  },
  {
    id: 22,
    name: "Stillsuits",
    conflictMarker: true,
    agentIcon: AgentIcon.FREMEN,
    influence: { faction: FactionType.FREMEN, amount: 1 },
    effects: [{ reward: { water: 1 } }],
    image: "board/stillsuits.png"
  },

  {
    id: 20,
    name: "Hardy Warriors",
    conflictMarker: true,
    agentIcon: AgentIcon.FREMEN,
    cost: { water: 1 },
    influence: { faction: FactionType.FREMEN, amount: 1 },
    effects: [{ reward: { troops: 2 } }],
    image: "board/hardy_warriors.png"
  },

  {
    id: 5,
    name: "The Great Flat",
    conflictMarker: true,
    agentIcon: AgentIcon.SPICE_TRADE,
    cost: { water: 2 },
    effects: [{ reward: { spice: 3 } }],
    makerSpace: MakerSpace.GREAT_FLAT,
    image: "board/the_great_flat.png"
  },

  {
    id: 6,
    name: "Hagga Basin",
    conflictMarker: true,
    agentIcon: AgentIcon.SPICE_TRADE,
    cost: { water: 1 },
    effects: [{ reward: { spice: 2 } }],
    makerSpace: MakerSpace.HAGGA_BASIN,
    image: "board/hagga_basin.png"
  },
] 