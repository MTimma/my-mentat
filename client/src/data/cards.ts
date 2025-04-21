import { Card, AgentIcon } from '../types/GameTypes'

export const STARTING_DECK: Card[] = [
  {
    id: 1,
    name: "Convincing Argument",
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
    agentIcons: []
  },
  {
    id: 2,
    name: "Convincing Argument",
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
    agentIcons: []
  },
  {
    id: 3,
    name: "Dagger",
    revealEffect: [
      {
        reward: {
          combat: 1
        }
      }
    ],
    agentIcons: [AgentIcon.LANDSRAAD]
  },
  {
    id: 4,
    name: "Dagger",
    revealEffect: [
      {
        reward: {
          combat: 1
        }
      }
    ],
    agentIcons: [AgentIcon.LANDSRAAD]
  },
  {
    id: 5,
    name: "Diplomacy",
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ],
    agentIcons: [
      AgentIcon.FREMEN,
      AgentIcon.BENE_GESSERIT,
      AgentIcon.SPACING_GUILD,
      AgentIcon.EMPEROR
    ]
  },
  {
    id: 6,
    name: "Dune, the Desert Planet",
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ],
    agentIcons: [AgentIcon.SPICE_TRADE]
  },
  {
    id: 7,
    name: "Dune, the Desert Planet",
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ],
    agentIcons: [AgentIcon.SPICE_TRADE]
  },
  {
    id: 8,
    name: "Reconnaissance",
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ],
    agentIcons: [AgentIcon.CITY]
  },
  {
    id: 9,
    name: "Seek Allies",
    agentIcons: [
      AgentIcon.FREMEN,
      AgentIcon.BENE_GESSERIT,
      AgentIcon.SPACING_GUILD,
      AgentIcon.EMPEROR
    ]
  },
  {
    id: 10,
    name: "Signet Ring",
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ],
    agentIcons: [
      AgentIcon.LANDSRAAD,
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE
    ]
  }
] 

export const ARRAKIS_LIAISON_DECK: Card[]  = [
  {
    id: 201,
    name: "Arrakis Liaison",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
  },
  {
    id: 202,
    name: "Arrakis Liaison",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
  },
  {
    id: 203,
    name: "Arrakis Liaison",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
  },
  {
    id: 204,
    name: "Arrakis Liaison",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
  },
  {
    id: 205,
    name: "Arrakis Liaison",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
  },
  {
    id: 206,
    name: "Arrakis Liaison",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
  },
  {
    id: 207,
    name: "Arrakis Liaison",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
  },
  {
    id: 208,
    name: "Arrakis Liaison",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ],
  }
]

export const SPICE_MUST_FLOW_DECK: Card[]  = [
  {
    id: 301,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ],
    cost: 9,
    acquireEffect: {victoryPoints: 1}
  },
  {
    id: 302,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ],
    cost: 9,
    acquireEffect: {victoryPoints: 1}
  },
  {
    id: 303,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ],
    cost: 9,  
    acquireEffect: {victoryPoints: 1}
  },
  {
    id: 304,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ], 
    cost: 9,
    acquireEffect: {victoryPoints: 1}
  },
  {
    id: 305,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ],
    cost: 9,
    acquireEffect: {victoryPoints: 1}
  },
  {
    id: 306,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ],
    cost: 9,
    acquireEffect: {victoryPoints: 1}
  },
  {
    id: 307,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ],
    cost: 9,
    acquireEffect: {victoryPoints: 1}
  },
  {
    id: 308,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ],
    cost: 9,
    acquireEffect: {victoryPoints: 1}
  },
  {
    id: 309,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ],
    cost: 9,
    acquireEffect: {victoryPoints: 1}
  },
  {
    id: 310,
    agentIcons: [],
    name: "Spice Must Flow",
    revealEffect: [
      {
        reward: {
          spice: 1
        }
      }
    ],
    cost: 9,
    acquireEffect: {victoryPoints: 1}
  }
]

export const FOLDSPACE_DECK: Card[] = [
  {
    id: 401,
    name: "Foldspace",
    agentIcons: [
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE,
      AgentIcon.LANDSRAAD,
      AgentIcon.EMPEROR,
      AgentIcon.FREMEN,
      AgentIcon.SPACING_GUILD,
      AgentIcon.BENE_GESSERIT
    ],
    playEffect: [
      {
        reward: {
          drawCards: 1,
          trashThisCard: true
        }
      }
    ],
  },
  {
    id: 402,
    name: "Foldspace",
    agentIcons: [
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE,
      AgentIcon.LANDSRAAD,
      AgentIcon.EMPEROR,
      AgentIcon.FREMEN,
      AgentIcon.SPACING_GUILD,
      AgentIcon.BENE_GESSERIT
    ],
    playEffect: [
      {
        reward: {
          drawCards: 1,
          trashThisCard: true
        }
      }
    ],
  },
  {
    id: 403,
    name: "Foldspace",
    agentIcons: [
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE,
      AgentIcon.LANDSRAAD,
      AgentIcon.EMPEROR,
      AgentIcon.FREMEN,
      AgentIcon.SPACING_GUILD,
      AgentIcon.BENE_GESSERIT
    ],
    playEffect: [
      {
        reward: {
          drawCards: 1,
          trashThisCard: true
        }
      }
    ],
  },
  {
    id: 404,
    name: "Foldspace",
    agentIcons: [
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE,
      AgentIcon.LANDSRAAD,
      AgentIcon.EMPEROR,
      AgentIcon.FREMEN,
      AgentIcon.SPACING_GUILD,
      AgentIcon.BENE_GESSERIT
    ],
    playEffect: [
      {
        reward: {
          drawCards: 1,
          trashThisCard: true
        }
      }
    ],
  },
  {
    id: 405,
    name: "Foldspace",
    agentIcons: [
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE,
      AgentIcon.LANDSRAAD,
      AgentIcon.EMPEROR,
      AgentIcon.FREMEN,
      AgentIcon.SPACING_GUILD,
      AgentIcon.BENE_GESSERIT
    ],
    playEffect: [
      {
        reward: {
          drawCards: 1,
          trashThisCard: true
        }
      }
    ],
  },
  {
    id: 406,
    name: "Foldspace",
    agentIcons: [
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE,
      AgentIcon.LANDSRAAD,
      AgentIcon.EMPEROR,
      AgentIcon.FREMEN,
      AgentIcon.SPACING_GUILD,
      AgentIcon.BENE_GESSERIT
    ],
    playEffect: [
      {
        reward: {
          drawCards: 1,
          trashThisCard: true
        }
      }
    ],
  },
  {
    id: 407,
    name: "Foldspace",
    agentIcons: [
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE,
      AgentIcon.LANDSRAAD,
      AgentIcon.EMPEROR,
      AgentIcon.FREMEN,
      AgentIcon.SPACING_GUILD,
      AgentIcon.BENE_GESSERIT
    ],
    playEffect: [
      {
        reward: {
          drawCards: 1,
          trashThisCard: true
        }
      }
    ],
  },
  {
    id: 408,
    name: "Foldspace",
    agentIcons: [
      AgentIcon.CITY,
      AgentIcon.SPICE_TRADE,
      AgentIcon.LANDSRAAD,
      AgentIcon.EMPEROR,
      AgentIcon.FREMEN,
      AgentIcon.SPACING_GUILD,
      AgentIcon.BENE_GESSERIT
    ],
    playEffect: [
      {
        reward: {
          drawCards: 1,
          trashThisCard: true
        }
      }
    ],
  }
]
