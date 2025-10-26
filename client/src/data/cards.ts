import { Card, AgentIcon, FactionType, ALL_AGENT_ICONS, CustomEffect } from '../types/GameTypes'
// export const STARTING_DECK: Card[] = [
//   {
//     id: 1,
//     name: "Crysknife",
//     image: "imperium_row/crysknife.avif",
//     agentIcons: [AgentIcon.FREMEN, AgentIcon.SPICE_TRADE],
//     cost: 3,
//     playEffect: [
//       {
//         reward: {
//           solari: 1
//         }
//       }
//     ],
//     revealEffect: [
//       {
//         reward: {
//           combat: 1
//         }
//       },
//       {
//         requirement: {
//           bond: FactionType.FREMEN
//         },
//         reward: {
//           influence: { influence: [{ faction: FactionType.FREMEN, amount: 1 }] }
//         }
//       }
//     ]
//   },
//   {
//     id: 2,
//     name: "Firm Grip",
//     image: "imperium_row/firm_grip.avif",
//     faction: [FactionType.EMPEROR],
//     agentIcons: [AgentIcon.EMPEROR, AgentIcon.LANDSRAAD],
//     cost: 4,
//     playEffect: [
//       {
//         cost: {
//           solari: 2
//         },
//         reward: {
//           influence: { 
//             chooseOne: true, 
//             influence: [
//               {faction: [FactionType.SPACING_GUILD],amount: 1},
//               {faction: [FactionType.FREMEN],amount: 1},
//               {faction: [FactionType.BENE_GESSERIT],amount: 1},
//             ]
//           }
//         }
//       }
//     ],
//     revealEffect: [
//       {
//         requirement: {
//           alliance: FactionType.EMPEROR
//         },
//         reward: {
//           persuasion: 4
//         }
//       }
//     ]
//   },
//   {
//     id: 3,
//     name: "Chani",
//     image: "imperium_row/chani.avif",
//     faction: [FactionType.FREMEN],
//     agentIcons: [AgentIcon.FREMEN, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
//     cost: 5,
//     acquireEffect: {
//       water: 1
//     },
//     revealEffect: [
//       {
//         reward: {
//           persuasion: 2
//         }
//       },
//       {
//         reward: {
//           retreatTroops: Number.MAX_SAFE_INTEGER
//         }
//       }
//     ]
//   },
//   {
//     id: 4,
//     name: "Guild Administrator",
//     image: "imperium_row/guild_administrator.avif",
//     faction: [FactionType.SPACING_GUILD],
//     agentIcons: [AgentIcon.SPACING_GUILD, AgentIcon.SPICE_TRADE],
//     cost: 2,
//     playEffect: [
//       {
//         reward: {
//           trash: 1
//         }
//       }
//     ],
//     revealEffect: [
//       {
//         reward: {
//           persuasion: 1
//         }
//       }
//     ]
//   }
// ]
export const STARTING_DECK: Card[] = [
  {
    id: 1,
    name: "Convincing Argument",
    image: "starter_deck/convincing_argument.avif",
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
    image: "starter_deck/convincing_argument.avif",
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
    image: "starter_deck/dagger.avif",
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
    image: "starter_deck/dagger.avif",
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
    image: "starter_deck/diplomacy.avif",
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
    image: "starter_deck/dune_the_desert_planet.avif",
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
    image: "starter_deck/dune_the_desert_planet.avif",
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
    image: "starter_deck/reconnaissance.avif",
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
    image: "starter_deck/seek_allies.avif",
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
    id: 10,
    name: "Signet Ring",
    image: "starter_deck/signet_ring.avif",
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
  },
  {
    id: 1036,
    name: "Other Memory",
    image: "imperium_row/other_memory.avif",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 4,
    playEffect: [
      {
        reward: {
          drawCards: 1
        },
        choiceOpt: true
        // implement OR effects
      },
      {
        reward: {
          custom: CustomEffect.OTHER_MEMORY
        },
        choiceOpt: true
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1031,
    name: "Kwisatz Haderach",
    image: "imperium_row/kwisatz_haderach.avif",
    faction: [FactionType.BENE_GESSERIT],
    infiltrate: true,
    agentIcons: ALL_AGENT_ICONS,
    cost: 8,
    playEffect: [
      {
        beforePlaceAgent: { recallAgent: true },
        reward: {}
      },
      {
        reward: {
          custom: CustomEffect.KWISATZ_HADERACH
        }
      },
      {
        reward: {
          drawCards: 1
        }
      }
    ]
  },
  {
    id: 1021,
    name: "Fremen Camp",
    image: "imperium_row/fremen_camp.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.SPICE_TRADE],
    cost: 4,
    playEffect: [
      {
        cost: {
          spice: 2
        },
        reward: {
          troops: 3
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2,
          combat: 1
        }
      }
    ]
  },
  {
    id: 1028,
    name: "Gurney Halleck",
    image: "imperium_row/gurney_halleck.avif",
    agentIcons: [AgentIcon.CITY],
    cost: 6,
    playEffect: [
      {
        reward: {
          troops: 2,
          drawCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      },
      {
        cost: {
          solari: 3
        },
        reward: {
          troops: 2,
          deployTroops: 2
        }
      }
    ]
  },
  {
    id: 1033,
    name: "Liet Kynes",
    image: "imperium_row/liet_kynes.avif",
    faction: [FactionType.FREMEN, FactionType.EMPEROR],
    agentIcons: [AgentIcon.FREMEN, AgentIcon.CITY],
    cost: 5,
    acquireEffect: {
      influence: {
        amounts: [
          { faction: FactionType.EMPEROR, amount: 1 }
        ]
      }
    },
  
    revealEffect: [
      {
        reward: {
          custom: CustomEffect.LIET_KYNES
        }
      }
    ]
  },
  {
    id: 1048,
    name: "Scout",
    image: "imperium_row/scout.avif",
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 1,
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 1,
          retreatTroops: 2
        }
      }
    ]
  },
  {
    id: 1051,
    name: "Shifting Allegiances",
    image: "imperium_row/shifting_allegiances.avif",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
    cost: 3,
    playEffect: [
      {
        cost: {
          spice: 2,
          influence: {
            chooseOne: true,
            amounts: [
              { faction: FactionType.SPACING_GUILD, amount: 1 },
              { faction: FactionType.FREMEN, amount: 1 },
              { faction: FactionType.BENE_GESSERIT, amount: 1 },
              { faction: FactionType.EMPEROR, amount: 1 },
            ]
          }
        },
        reward: {
          influence: {
            chooseOne: true,
            amounts: [
              { faction: FactionType.SPACING_GUILD, amount: 2 },
              { faction: FactionType.FREMEN, amount: 2 },
              { faction: FactionType.BENE_GESSERIT, amount: 2 },
              { faction: FactionType.EMPEROR, amount: 2 },
            ]
          }
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  }
] 

export const ARRAKIS_LIAISON_DECK: Card[]  = [
  {
    id: 201,
    name: "Arrakis Liaison",
    faction: [FactionType.FREMEN],
    image: "imperium_row/arrakis_liaison.avif",
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
    faction: [FactionType.FREMEN],
    image: "imperium_row/arrakis_liaison.avif",
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
    faction: [FactionType.FREMEN],
    image: "imperium_row/arrakis_liaison.avif",
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
    faction: [FactionType.FREMEN],
    image: "imperium_row/arrakis_liaison.avif",
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
    image: "imperium_row/arrakis_liaison.avif",
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
    faction: [FactionType.FREMEN],
    image: "imperium_row/arrakis_liaison.avif",
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
    faction: [FactionType.FREMEN],
    image: "imperium_row/arrakis_liaison.avif",
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
    image: "imperium_row/arrakis_liaison.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/spice_must_flow.avif",
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
    image: "imperium_row/foldspace.avif",
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
    image: "imperium_row/foldspace.avif",
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
    image: "imperium_row/foldspace.avif",
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
    image: "imperium_row/foldspace.avif",
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
    image: "imperium_row/foldspace.avif",
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
    image: "imperium_row/foldspace.avif",
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
    image: "imperium_row/foldspace.avif",
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
    image: "imperium_row/foldspace.avif",
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

export const IMPERIUM_ROW_DECK: Card[] = [
  {
    id: 1001,
    name: "Arrakis Recruiter",
    image: "imperium_row/arrakis_recruiter.png",
    agentIcons: [AgentIcon.CITY],
    cost: 2,
    playEffect: [
      {
        reward: {
          troops: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          combat: 1,
          persuasion: 1
        }
      }
    ]
  },
  {
    id: 1002,
    name: "Arrakis Recruiter",
    image: "imperium_row/arrakis_recruiter.png",
    agentIcons: [AgentIcon.CITY],
    cost: 2,
    playEffect: [
      {
        reward: {
          troops: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          combat: 1,
          persuasion: 1
        }
      }
    ]
  },
  {
    id: 1004,
    name: "Assassination Mission",
    image: "imperium_row/assassination_mission.png",
    agentIcons: [],
    cost: 1,
    trashEffect: [
      {
        reward: {
          solari: 4
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          combat: 1,
          solari: 1
        }
      }
    ]
  },
  {
    id: 1005,
    name: "Assassination Mission",
    image: "imperium_row/assassination_mission.png",
    agentIcons: [],
    cost: 1,
    trashEffect: [
      {
        reward: {
          solari: 4
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          combat: 1,
          solari: 1
        }
      }
    ]
  },
  {
    id: 1006,
    name: "Bene Gesserit Initiate",
    image: "imperium_row/bene_gesserit_initiate.png",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 3,
    playEffect: [
      {
        reward: {
          drawCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ]
  },
  {
    id: 1007,
    name: "Bene Gesserit Initiate",
    image: "imperium_row/bene_gesserit_initiate.png",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 3,
    playEffect: [
      {
        reward: {
          drawCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ]
  },
  {
    id: 1008,
    name: "Bene Gesserit Sister",
    image: "imperium_row/bene_gesserit_sister.png",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.BENE_GESSERIT],
    cost: 3,
    revealEffect: [
      {
        reward: {
          persuasion: 2,
          combat: 2
        },
        choiceOpt: true
      }
    ]
  },
  {
    id: 1009,
    name: "Bene Gesserit Sister",
    image: "imperium_row/bene_gesserit_sister.png",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.BENE_GESSERIT],
    cost: 3,
    revealEffect: [
      {
        reward: {
          persuasion: 2,
          combat: 2
        },
        choiceOpt: true
      }
    ]
  },
  {
    id: 1010,
    name: "Bene Gesserit Sister",
    image: "imperium_row/bene_gesserit_sister.png",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.BENE_GESSERIT],
    cost: 3,
    revealEffect: [
      {
        reward: {
          persuasion: 2,
          combat: 2
        },
        choiceOpt: true
      }
    ]
  },
  {
    id: 1011,
    name: "Carryall",
    image: "imperium_row/carryall.avif",
    agentIcons: [AgentIcon.SPICE_TRADE],
    cost: 5,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.CARRYALL
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          spice: 1
        }
      }
    ]
  },
  {
    id: 1012,
    name: "Chani",
    image: "imperium_row/chani.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.FREMEN, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 5,
    acquireEffect: {
      water: 1
    },
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      },
      {
        reward: {
          retreatTroops: Number.MAX_SAFE_INTEGER
        }
      }
    ]
  },
  {
    id: 1013,
    name: "CHOAM Directorship",
    image: "imperium_row/choam_directorship.avif",
    agentIcons: [],
    cost: 8,
    acquireEffect: {
      
      influence: {  
        amounts: [
          { faction: FactionType.FREMEN, amount: 1 },
          { faction: FactionType.BENE_GESSERIT, amount: 1 },
          { faction: FactionType.SPACING_GUILD, amount: 1 },
          { faction: FactionType.EMPEROR, amount: 1 }
        ]
      }
    },
    revealEffect: [
      {
        reward: {
          solari: 3
        }
      }
    ]
  },
  {
    id: 1014,
    name: "Crysknife",
    image: "imperium_row/crysknife.avif",
    agentIcons: [AgentIcon.FREMEN, AgentIcon.SPICE_TRADE],
    cost: 3,
    playEffect: [
      {
        reward: {
          solari: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          combat: 1
        }
      },
      {
        requirement: {
          bond: FactionType.FREMEN
        },
        reward: {
          influence: { amounts: [{ faction: FactionType.FREMEN, amount: 1 }] }
        }
      }
    ]
  },
  {
    id: 1015,
    name: "Dr. Yueh",
    image: "imperium_row/dr_yueh.avif",
    agentIcons: [AgentIcon.CITY],
    cost: 1,
    playEffect: [
      {
        reward: {
          drawCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ]
  },
  {
    id: 1017,
    name: "Duncan Idaho",
    image: "imperium_row/duncan_idaho.avif",
    agentIcons: [AgentIcon.CITY],
    cost: 4,
    playEffect: [
      {
        cost: {
          water : 1
        },
        reward: {
          drawCards: 1,
          troops: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          water: 1,
          combat: 2
        }
      }
    ]
  },
  {
    id: 1018,
    name: "Fedaykin Death Commando",
    image: "imperium_row/fedaykin_death_commando.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.SPICE_TRADE, AgentIcon.CITY],
    cost: 3,
    playEffect: [
      {
        reward: {
          trash : 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      },
      {
        requirement: {
          bond: FactionType.FREMEN
        },
        reward: {
          combat: 3
        }
      }
    ]
  },
  {
    id: 1019,
    name: "Fedaykin Death Commando",
    image: "imperium_row/fedaykin_death_commando.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.SPICE_TRADE, AgentIcon.CITY],
    cost: 3,
    playEffect: [
      {
        reward: {
          trash : 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      },
      {
        requirement: {
          bond: FactionType.FREMEN
        },
        reward: {
          combat: 3
        }
      }
    ]
  },
  {
    id: 1020,
    name: "Firm Grip",
    image: "imperium_row/firm_grip.avif",
    faction: [FactionType.EMPEROR],
    agentIcons: [AgentIcon.EMPEROR, AgentIcon.LANDSRAAD],
    cost: 4,
    playEffect: [
      {
        cost: {
          solari: 2
        },
        reward: {
          influence: { 
            chooseOne: true, 
            amounts: [
              {faction: FactionType.SPACING_GUILD,amount: 1},
              {faction: FactionType.FREMEN,amount: 1},
              {faction: FactionType.BENE_GESSERIT,amount: 1},
            ]
          }
        }
      }
    ],
    revealEffect: [
      {
        requirement: {
          alliance: FactionType.EMPEROR
        },
        reward: {
          persuasion: 4
        }
      }
    ]
  },
  {
    id: 1021,
    name: "Fremen Camp",
    image: "imperium_row/fremen_camp.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.SPICE_TRADE],
    cost: 4,
    playEffect: [
      {
        cost: {
          spice: 2
        },
        reward: {
          troops: 3
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2,
          combat: 1
        }
      }
    ]
  },
  {
    id: 1022,
    name: "Fremen Camp",
    image: "imperium_row/fremen_camp.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.SPICE_TRADE],
    cost: 4,
    playEffect: [
      {
        cost: {
          spice: 2
        },
        reward: {
          troops: 3
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2,
          combat: 1
        }
      }
    ]
  },
  {
    id: 1023,
    name: "Gene Manipulation",
    image: "imperium_row/gene_manipulation.avif",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 3,
    playEffect: [
      {
        reward: {
          trash: 1
        }
      },
      {
        requirement: {
          inPlay: FactionType.BENE_GESSERIT
        },
        reward: {
          spice: 2
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1024,
    name: "Gene Manipulation",
    image: "imperium_row/gene_manipulation.avif",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
    cost: 3,
    playEffect: [
      {
        reward: {
          trash: 1
        }
      },
      {
        requirement: {
          inPlay: FactionType.BENE_GESSERIT
        },
        reward: {
          spice: 2
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1025,
    name: "Guild Administrator",
    image: "imperium_row/guild_administrator.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.SPACING_GUILD, AgentIcon.SPICE_TRADE],
    cost: 2,
    playEffect: [
      {
        reward: {
          trash: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ]
  },
  {
    id: 1026,
    name: "Guild Administrator",
    image: "imperium_row/guild_administrator.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.SPACING_GUILD, AgentIcon.SPICE_TRADE],
    cost: 2,
    playEffect: [
      {
        reward: {
          trash: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ]
  },
  {
    id: 1026,
    name: "Guild Ambassador",
    image: "imperium_row/guild_ambassador.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.LANDSRAAD],
    cost: 4,
    playEffect: [
      {
        choiceOpt: true,
        reward: {
          influence: {
            amounts: [
              { faction: FactionType.SPACING_GUILD, amount: 1 },
            ]
          }
        }
      },
      {
        reward: {
          spice: 2
        }
      }
    ],
    revealEffect: [
      {
        requirement: {
          alliance: FactionType.SPACING_GUILD
        },
        cost: {
          spice: 3
        },
        reward: {
          victoryPoints: 1
        }
      }
    ]
  },
  {
    id: 1026,
    name: "Guild Bankers",
    image: "imperium_row/guild_bankers.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.LANDSRAAD],
    cost: 3,
    revealEffect: [
      {
        reward: {
          custom: CustomEffect.GUILD_BANKERS
        }
      }
    ]
  },
  {
    id: 1027,
    name: "Gun Thopter",
    image: "imperium_row/gun_thopter.avif",
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 4,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.GUN_THOPTER
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          combat: 3
        }
      },
      {
        reward: {
          deployTroops: 1
        }
      }
    ]
  },
  {
    id: 1028,
    name: "Gun Thopter",
    image: "imperium_row/gun_thopter.avif",
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 4,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.GUN_THOPTER
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          combat: 3
        }
      },
      {
        reward: {
          deployTroops: 1
        }
      }
    ]
  },
  {
    id: 1029,
    name: "Gurney Halleck",
    image: "imperium_row/gurney_halleck.avif",
    agentIcons: [AgentIcon.CITY],
    cost: 6,
    playEffect: [
      {
        reward: {
          troops: 2,
          drawCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      },
      {
        cost: {
          solari: 3
        },
        reward: {
          troops: 2,
          deployTroops: 2
        }
      }
    ]
  },
  {
    id: 1030,
    name: "Imperial Spy",
    image: "imperium_row/imperial_spy.avif",
    faction: [FactionType.EMPEROR],
    agentIcons: [AgentIcon.EMPEROR],
    cost: 2,
    playEffect: [
      {
        cost: {
          trashThisCard: true
        },
        reward: {
          intrigueCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 1
        }
      }
    ]
  },
  {
    id: 1031,
    name: "Imperial Spy",
    image: "imperium_row/imperial_spy.avif",
    faction: [FactionType.EMPEROR],
    agentIcons: [AgentIcon.EMPEROR],
    cost: 2,
    playEffect: [
      {
        cost: {
          trashThisCard: true
        },
        reward: {
          intrigueCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 1
        }
      }
    ]
  },
  {
    id: 1032,
    name: "Kwisatz Haderach",
    image: "imperium_row/kwisatz_haderach.avif",
    faction: [FactionType.BENE_GESSERIT],
    infiltrate: true, //TODO not only infiltrate, it ignores space costs as well
    //TODO add to turn controls indicator when recalling agent
    agentIcons: ALL_AGENT_ICONS,
    cost: 8,
    playEffect: [
      {
        beforePlaceAgent: { recallAgent: true },
        reward: {
          custom: CustomEffect.KWISATZ_HADERACH
        }
      },
      {
        reward: {
          drawCards: 1
        }
      }
    ]
  },
  {
    id: 1033,
    name: "Lady Jessica",
    image: "imperium_row/lady_jessica.avif",
    faction: [FactionType.BENE_GESSERIT],
    infiltrate: true, //TODO not only infiltrate, it ignores space costs as well
    //TODO add to turn controls indicator when recalling agent
    agentIcons: [AgentIcon.BENE_GESSERIT, AgentIcon.CITY, AgentIcon.SPICE_TRADE, AgentIcon.LANDSRAAD],
    cost: 7,
    acquireEffect: {
      influence: {
        chooseOne: true,
        amounts: [
          { faction: FactionType.BENE_GESSERIT, amount: 1 },
          { faction: FactionType.FREMEN, amount: 1 },
          { faction: FactionType.SPACING_GUILD, amount: 1 },
          { faction: FactionType.EMPEROR, amount: 1 }
        ]
      }
    },
    playEffect: [
      {
        reward: {
          drawCards: 2
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 3,
          combat: 1
        }
      }
    ]
  },
  {
    id: 1034,
    name: "Liet Kynes",
    image: "imperium_row/liet_kynes.avif",
    faction: [FactionType.FREMEN, FactionType.EMPEROR],
    agentIcons: [AgentIcon.FREMEN, AgentIcon.CITY],
    cost: 5,
    acquireEffect: {
      influence: {
        amounts: [
          { faction: FactionType.EMPEROR, amount: 1 }
        ]
      }
    },
  
    revealEffect: [
      {
        reward: {
          custom: CustomEffect.LIET_KYNES
        }
      }
    ]
  },
  {
    id: 1035,
    name: "Missionaria Protectiva",
    image: "imperium_row/missionaria_protectiva.avif",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.CITY],
    cost: 1,
    playEffect: [
      {
        requirement: {
          inPlay: FactionType.BENE_GESSERIT
        },
        reward: {
          influence: {
            chooseOne: true,
            amounts: [
              { faction: FactionType.BENE_GESSERIT, amount: 1 },
              { faction: FactionType.FREMEN, amount: 1 },
              { faction: FactionType.SPACING_GUILD, amount: 1 },
              { faction: FactionType.EMPEROR, amount: 1 }
            ]
          }
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ]
  },
  {
    id: 1036,
    name: "Missionaria Protectiva",
    image: "imperium_row/missionaria_protectiva.avif",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.CITY],
    cost: 1,
    playEffect: [
      {
        requirement: {
          inPlay: FactionType.BENE_GESSERIT
        },
        reward: {
          influence: {
            chooseOne: true,
            amounts: [
              { faction: FactionType.BENE_GESSERIT, amount: 1 },
              { faction: FactionType.FREMEN, amount: 1 },
              { faction: FactionType.SPACING_GUILD, amount: 1 },
              { faction: FactionType.EMPEROR, amount: 1 }
            ]
          }
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      }
    ]
  },
  {
    id: 1037,
    name: "Other Memory",
    image: "imperium_row/other_memory.avif",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 4,
    playEffect: [
      {
        reward: {
          drawCards: 1
        },
        choiceOpt: true
        // implement OR effects
      },
      {
        reward: {
          custom: CustomEffect.OTHER_MEMORY
        },
        choiceOpt: true
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1038,
    name: "Opulence",
    image: "imperium_row/opulence.avif",
    faction: [FactionType.EMPEROR],
    agentIcons: [AgentIcon.EMPEROR],
    cost: 6,
    playEffect: [
      {
        reward: {
          solari: 3
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1
        }
      },
      {
        cost: {
          solari: 6
        },
        reward: {
          victoryPoints: 1
        }
      }
    ]
  },
  {
    id: 1039,
    name: "Piter De Vries",
    image: "imperium_row/piter_de_vries.avif",
    agentIcons: [AgentIcon.CITY, AgentIcon.LANDSRAAD],
    cost: 5,
    playEffect: [
      {
        reward: {
          intrigueCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 3,
          combat: 1
        }
      }
    ]
  },
  {
    id: 1040,
    name: "Power Play",
    image: "imperium_row/power_play.avif",
    agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.BENE_GESSERIT, AgentIcon.FREMEN],
    cost: 5,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.POWER_PLAY,//TODO can trash this card before getting effect
        },
      },
      {
        reward: {
          trashThisCard: true
        }
      }
    ]
  },
  {
    id: 1041,
    name: "Power Play",
    image: "imperium_row/power_play.avif",
    agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.BENE_GESSERIT, AgentIcon.FREMEN],
    cost: 5,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.POWER_PLAY,//TODO can trash this card before getting effect
        },
      },
      {
        reward: {
          trashThisCard: true
        }
      }
    ]
  },
  {
    id: 1042,
    name: "Power Play",
    image: "imperium_row/power_play.avif",
    agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.BENE_GESSERIT, AgentIcon.FREMEN],
    cost: 5,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.POWER_PLAY,//TODO can trash this card before getting effect
        },
      },
      {
        reward: {
          trashThisCard: true
        }
      }
    ]
  },
  {
    id: 1043,
    name: "Reverend Mother Mohiam",
    image: "imperium_row/reverend_mother_mohiam.avif",
    faction: [FactionType.EMPEROR, FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.EMPEROR, AgentIcon.BENE_GESSERIT],
    cost: 6,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.REVEREND_MOTHER_MOHIAM,//TODO can trash this card before getting effect
        },
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2,
          spice: 2
        }
      }
    ]
  },
  {
    id: 1044,
    name: "Sardaukar Infantry",
    image: "imperium_row/sardaukar_infantry.avif",
    faction: [FactionType.EMPEROR],
    agentIcons: [],
    cost: 1,
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 2
        }
      }
    ]
  },
  {
    id: 1045,
    name: "Sardaukar Infantry",
    image: "imperium_row/sardaukar_infantry.avif",
    faction: [FactionType.EMPEROR],
    agentIcons: [],
    cost: 1,
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 2
        }
      }
    ]
  },
  {
    id: 1046,
    name: "Sardaukar Legion",
    image: "imperium_row/sardaukar_legion.avif",
    faction: [FactionType.EMPEROR],
    agentIcons: [AgentIcon.EMPEROR, AgentIcon.LANDSRAAD],
    cost: 5,
    playEffect: [
      {
        reward: {
          troops: 2
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          deployTroops: 3
        }
      }
    ]
  },
  {
    id: 1047,
    name: "Sardaukar Legion",
    image: "imperium_row/sardaukar_legion.avif",
    faction: [FactionType.EMPEROR],
    agentIcons: [AgentIcon.EMPEROR, AgentIcon.LANDSRAAD],
    cost: 5,
    playEffect: [
      {
        reward: {
          troops: 2
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          deployTroops: 3
        }
      }
    ]
  },
  {
    id: 1048,
    name: "Scout",
    image: "imperium_row/scout.avif",
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 1,
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 1,
          retreatTroops: 2
        }
      }
    ]
  },
  {
    id: 1049,
    name: "Scout",
    image: "imperium_row/scout.avif",
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 1,
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 1,
          retreatTroops: 2
        }
      }
    ]
  },
  {
    id: 1050,
    name: "Shifting Allegiances",
    image: "imperium_row/shifting_allegiances.avif",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
    cost: 3,
    playEffect: [
      {
        cost: {
          spice: 2,
          influence: {
            chooseOne: true,
            amounts: [
              { faction: FactionType.SPACING_GUILD, amount: 1 },
              { faction: FactionType.FREMEN, amount: 1 },
              { faction: FactionType.BENE_GESSERIT, amount: 1 },
              { faction: FactionType.EMPEROR, amount: 1 },
            ]
          }
        },
        reward: {
          influence: {
            chooseOne: true,
            amounts: [
              { faction: FactionType.SPACING_GUILD, amount: 2 },
              { faction: FactionType.FREMEN, amount: 2 },
              { faction: FactionType.BENE_GESSERIT, amount: 2 },
              { faction: FactionType.EMPEROR, amount: 2 },
            ]
          }
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1051,
    name: "Shifting Allegiances",
    image: "imperium_row/shifting_allegiances.avif",
    agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
    cost: 3,
    playEffect: [
      {
        cost: {
          spice: 2,
          influence: {
            chooseOne: true,
            amounts: [
              { faction: FactionType.SPACING_GUILD, amount: 1 },
              { faction: FactionType.FREMEN, amount: 1 },
              { faction: FactionType.BENE_GESSERIT, amount: 1 },
              { faction: FactionType.EMPEROR, amount: 1 },
            ]
          }
        },
        reward: {
          influence: {
            chooseOne: true,
            amounts: [
              { faction: FactionType.SPACING_GUILD, amount: 2 },
              { faction: FactionType.FREMEN, amount: 2 },
              { faction: FactionType.BENE_GESSERIT, amount: 2 },
              { faction: FactionType.EMPEROR, amount: 2 },
            ]
          }
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1052,
    name: "Sietch Reverend Mother",
    image: "imperium_row/sietch_reverend_mother.avif",
    faction: [FactionType.BENE_GESSERIT, FactionType.FREMEN],
    agentIcons: [AgentIcon.BENE_GESSERIT, AgentIcon.FREMEN],
    cost: 4,
    playEffect: [
      {
        reward: {
          trash: 1
        }
      }
    ],
    revealEffect: [
      {
        requirement: {
          bond: FactionType.FREMEN
        },
        reward: {
          persuasion: 3,
          spice: 1
        }
      }
    ]
  },
  {
    id: 1053,
    name: "Smuggler's Thopter",
    image: "imperium_row/smugglers_thopter.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.SPICE_TRADE],
    cost: 4,
    revealEffect: [
      {
        requirement: {
          influence: {  
            faction: FactionType.SPACING_GUILD,
            amount: 2
          }
        },
        reward: {
          persuasion: 1,
          spice: 1
        }
      }
    ]
  },
  {
    id: 1054,
    name: "Smuggler's Thopter",
    image: "imperium_row/smugglers_thopter.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.SPICE_TRADE],
    cost: 4,
    revealEffect: [
      {
        requirement: {
          influence: {  
            faction: FactionType.SPACING_GUILD,
            amount: 2
          }
        },
        reward: {
          persuasion: 1,
          spice: 1
        }
      }
    ]
  },
  {
    id: 1055,
    name: "Space Travel",
    image: "imperium_row/space_travel.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.SPACING_GUILD],
    cost: 3,
    playEffect: [
      {
        reward: {
          drawCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1056,
    name: "Space Travel",
    image: "imperium_row/space_travel.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.SPACING_GUILD],
    cost: 3,
    playEffect: [
      {
        reward: {
          drawCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1057,
    name: "Spice Hunter",
    image: "imperium_row/spice_hunter.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.FREMEN, AgentIcon.SPICE_TRADE],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 1
        }
      },
      {
        requirement: {
          bond: FactionType.FREMEN
        },
        reward: {
          spice: 1
        }
      }
    ]
  },
  {
    id: 1057,
    name: "Spice Hunter",
    image: "imperium_row/spice_hunter.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.FREMEN, AgentIcon.SPICE_TRADE],
    cost: 2,
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 1
        }
      },
      {
        requirement: {
          bond: FactionType.FREMEN
        },
        reward: {
          spice: 1
        }
      }
    ]
  },
  {
    id: 1058,
    name: "Spice Smugglers",
    image: "imperium_row/spice_smugglers.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.CITY],
    cost: 2,
    playEffect: [
      {
        cost: {
          spice: 2
        },
        reward: {
          influence: {
            amounts: [
              { faction: FactionType.SPACING_GUILD, amount: 1 },
            ]
          },
          solari: 3
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 1
        }
      }
    ]
  },
  {
    id: 1058,
    name: "Spice Smugglers",
    image: "imperium_row/spice_smugglers.avif",
    faction: [FactionType.SPACING_GUILD],
    agentIcons: [AgentIcon.CITY],
    cost: 2,
    playEffect: [
      {
        cost: {
          spice: 2
        },
        reward: {
          influence: {
            amounts: [
              { faction: FactionType.SPACING_GUILD, amount: 1 },
            ]
          },
          solari: 3
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          combat: 1
        }
      }
    ]
  },
  {
    id: 1059,
    name: "Stilgar",
    image: "imperium_row/stilgar.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.FREMEN, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 5,
    playEffect: [
      {
        reward: {
          water: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2,
          combat: 3
        }
      }
    ]
  },
  {
    id: 1060,
    name: "Test of Humanity",
    image: "imperium_row/test_of_humanity.avif",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.BENE_GESSERIT, AgentIcon.CITY, AgentIcon.LANDSRAAD],
    cost: 3,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.TEST_OF_HUMANITY
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1061,
    name: "The Voice",
    image: "imperium_row/the_voice.avif",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 2,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.THE_VOICE
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1062,
    name: "The Voice",
    image: "imperium_row/the_voice.avif",
    faction: [FactionType.BENE_GESSERIT],
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 2,
    playEffect: [
      {
        reward: {
          custom: CustomEffect.THE_VOICE
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 2
        }
      }
    ]
  },
  {
    id: 1063,
    name: "Thufir Hawat",
    image: "imperium_row/thufir_hawat.avif",
    agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.BENE_GESSERIT, AgentIcon.FREMEN, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 5,
    playEffect: [
      {
        reward: {
          drawCards: 1
        }
      }
    ],
    revealEffect: [
      {
        reward: {
          persuasion: 1,
          intrigueCards: 1
        }
      }
    ]
  },
  {
    id: 1064,
    name: "Worm Riders",
    image: "imperium_row/worm_riders.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 6,
    playEffect: [
      {
        reward: {
          spice: 2
        }
      }
    ],
    revealEffect: [
      {
        requirement: {
          influence: {
            faction: FactionType.FREMEN,
            amount: 2
          }
        },
        reward: {
          combat: 4
        }
      },
      {
        requirement: {
          alliance: FactionType.FREMEN
        },
        reward: {
          combat: 2
        }
      }
    ]
  },
  {
    id: 1065,
    name: "Worm Riders",
    image: "imperium_row/worm_riders.avif",
    faction: [FactionType.FREMEN],
    agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
    cost: 6,
    playEffect: [
      {
        reward: {
          spice: 2
        }
      }
    ],
    revealEffect: [
      {
        requirement: {
          influence: {
            faction: FactionType.FREMEN,
            amount: 2
          }
        },
        reward: {
          combat: 4
        }
      },
      {
        requirement: {
          alliance: FactionType.FREMEN
        },
        reward: {
          combat: 2
        }
      }
    ]
  }

]
