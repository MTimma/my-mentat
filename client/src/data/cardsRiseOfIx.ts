import { Card, AgentIcon, FactionType, CustomEffect } from '../types/GameTypes'

const clone = <T>(data: T): T => JSON.parse(JSON.stringify(data))

function expandCopies(templates: Array<{ card: Omit<Card, 'id'>; qty: number }>): Card[] {
  const deck: Card[] = []
  for (const { card, qty } of templates) {
    for (let i = 0; i < qty; i++) {
      deck.push({ ...clone(card), id: 0 })
    }
  }
  return deck
}

const ANY_FACTION_INFLUENCE = {
  chooseOne: true as const,
  amounts: [
    { faction: FactionType.EMPEROR, amount: 1 },
    { faction: FactionType.SPACING_GUILD, amount: 1 },
    { faction: FactionType.BENE_GESSERIT, amount: 1 },
    { faction: FactionType.FREMEN, amount: 1 },
  ],
}

const NON_BG_INFLUENCE = {
  chooseOne: true as const,
  amounts: [
    { faction: FactionType.EMPEROR, amount: 1 },
    { faction: FactionType.SPACING_GUILD, amount: 1 },
    { faction: FactionType.FREMEN, amount: 1 },
  ],
}

/** Rise of Ix imperium row cards — 29 unique definitions, 35 instances total. */
const RISE_OF_IX_CARD_TEMPLATES: Array<{ card: Omit<Card, 'id'>; qty: number }> = [
  {
    qty: 1,
    card: {
      name: 'Appropriate',
      image: 'imperium_row/rise_of_ix/appropriate.png',
      faction: [FactionType.EMPEROR],
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
      cost: 5,
      riseOfIx: true,
      acquireEffect: { freighter: 1 },
      playEffect: [
        {
          requirement: { influence: { faction: FactionType.EMPEROR, amount: 2 } },
          reward: { acquireTech: { paySolariInsteadOfSpice: true } },
        },
      ],
      revealEffect: [{ reward: { persuasion: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Bounty Hunter',
      image: 'imperium_row/rise_of_ix/bounty_hunter.png',
      agentIcons: [AgentIcon.CITY],
      cost: 1,
      riseOfIx: true,
      infiltrate: true,
      playEffect: [{ reward: { custom: CustomEffect.BOUNTY_INFILTRATION_BONUS } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'CHOAM Delegate',
      image: 'imperium_row/rise_of_ix/choam_delegate.png',
      agentIcons: [AgentIcon.SPICE_TRADE],
      cost: 1,
      riseOfIx: true,
      infiltrate: true,
      unload: true,
      revealEffect: [{ reward: { solari: 3 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Court Intrigue',
      image: 'imperium_row/rise_of_ix/court_intrigue.png',
      faction: [FactionType.EMPEROR],
      agentIcons: [AgentIcon.EMPEROR],
      cost: 2,
      riseOfIx: true,
      infiltrate: true,
      playEffect: [
        {
          cost: { intrigueBottom: 1 },
          reward: { intrigueCards: 1 },
        },
      ],
      revealEffect: [{ reward: { persuasion: 1, combat: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Desert Ambush',
      image: 'imperium_row/rise_of_ix/desert_ambush.png',
      faction: [FactionType.FREMEN],
      agentIcons: [AgentIcon.SPICE_TRADE],
      cost: 3,
      riseOfIx: true,
      revealEffect: [
        { reward: { persuasion: 1, combat: 1 } },
        { reward: { custom: CustomEffect.DESERT_AMBUSH } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Embedded Agent',
      image: 'imperium_row/rise_of_ix/embedded_agent.png',
      faction: [FactionType.BENE_GESSERIT],
      agentIcons: [AgentIcon.LANDSRAAD],
      cost: 5,
      riseOfIx: true,
      infiltrate: true,
      playEffect: [
        {
          requirement: { inPlay: FactionType.BENE_GESSERIT },
          reward: { freighter: 2 },
        },
      ],
      revealEffect: [{ reward: { persuasion: 1, intrigueCards: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Esmar Tuek',
      image: 'imperium_row/rise_of_ix/esmar_tuek.png',
      faction: [FactionType.SPACING_GUILD],
      agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 5,
      riseOfIx: true,
      unload: true,
      playEffect: [
        {
          cost: { spice: 1 },
          reward: {
            influence: { amounts: [{ faction: FactionType.SPACING_GUILD, amount: 1 }] },
            drawCards: 1,
          },
        },
      ],
      revealEffect: [{ reward: { spice: 2, solari: 2 } }],
    },
  },
  {
    qty: 2,
    card: {
      name: 'Freighter Fleet',
      image: 'imperium_row/rise_of_ix/freighter_fleet.png',
      agentIcons: [AgentIcon.SPICE_TRADE],
      cost: 2,
      riseOfIx: true,
      unload: true,
      revealEffect: [{ reward: { freighter: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Full-Scale Assault',
      image: 'imperium_row/rise_of_ix/full_scale_assault.png',
      faction: [FactionType.EMPEROR],
      agentIcons: [AgentIcon.EMPEROR, AgentIcon.CITY],
      cost: 8,
      riseOfIx: true,
      acquireEffect: { dreadnoughts: 1 },
      playEffect: [{ reward: { troops: 2 } }],
      revealEffect: [
        { reward: { persuasion: 2 } },
        { reward: { custom: CustomEffect.FULLSCALE_DREAD_SWORDS } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Guild Accord',
      image: 'imperium_row/rise_of_ix/guild_accord.png',
      faction: [FactionType.SPACING_GUILD],
      agentIcons: [AgentIcon.SPACING_GUILD],
      cost: 6,
      riseOfIx: true,
      infiltrate: true,
      unload: true,
      playEffect: [{ reward: { custom: CustomEffect.GUILD_ACCORD_HEIGHTLINER_DISCOUNT } }],
      revealEffect: [
        { reward: { water: 1 } },
        {
          requirement: { alliance: FactionType.SPACING_GUILD },
          reward: { spice: 3 },
        },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Guild Chief Administrator',
      image: 'imperium_row/rise_of_ix/guild_chief_administrator.png',
      faction: [FactionType.SPACING_GUILD],
      agentIcons: [AgentIcon.SPACING_GUILD, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 4,
      riseOfIx: true,
      playEffect: [
        {
          cost: { discard: 1 },
          reward: { trash: 1 },
        },
      ],
      revealEffect: [{ reward: { persuasion: 1, freighter: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Imperial Bashar',
      image: 'imperium_row/rise_of_ix/imperial_bashar.png',
      faction: [FactionType.EMPEROR],
      agentIcons: [AgentIcon.CITY],
      cost: 4,
      riseOfIx: true,
      playEffect: [
        { reward: { troops: 1 }, choiceOpt: true },
        { reward: { trash: 1 }, choiceOpt: true },
      ],
      revealEffect: [
        { reward: { persuasion: 1 } },
        { reward: { custom: CustomEffect.IMPERIAL_BASHAR_SWORDS } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Imperial Shock Trooper',
      image: 'imperium_row/rise_of_ix/imperial_shock_trooper.png',
      faction: [FactionType.EMPEROR],
      agentIcons: [],
      cost: 3,
      riseOfIx: true,
      revealEffect: [
        { reward: { persuasion: 1 } },
        { reward: { custom: CustomEffect.SHOCKTROOPER_EM_BONUS } },
      ],
    },
  },
  {
    qty: 2,
    card: {
      name: 'In the Shadows',
      image: 'imperium_row/rise_of_ix/in_the_shadows.png',
      faction: [FactionType.BENE_GESSERIT],
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
      cost: 2,
      riseOfIx: true,
      unload: true,
      playEffect: [
        {
          requirement: { influence: { faction: FactionType.BENE_GESSERIT, amount: 2 } },
          cost: { discard: 1 },
          reward: { influence: NON_BG_INFLUENCE },
        },
      ],
      revealEffect: [
        {
          reward: {
            influence: { amounts: [{ faction: FactionType.BENE_GESSERIT, amount: 1 }] },
          },
        },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Ix-Guild Compact',
      image: 'imperium_row/rise_of_ix/ix_guild_compact.png',
      faction: [FactionType.SPACING_GUILD],
      agentIcons: [AgentIcon.SPACING_GUILD],
      cost: 3,
      riseOfIx: true,
      unload: true,
      playEffect: [
        {
          cost: { discard: 2 },
          reward: { dreadnoughts: 1 },
        },
      ],
      revealEffect: [{ reward: { techNegotiator: 2 } }],
    },
  },
  {
    qty: 2,
    card: {
      name: 'Ixian Engineer',
      image: 'imperium_row/rise_of_ix/ixian_engineer.png',
      agentIcons: [AgentIcon.SPICE_TRADE],
      cost: 5,
      riseOfIx: true,
      playEffect: [{ reward: { acquireTech: {} } }],
      revealEffect: [{ reward: { custom: CustomEffect.IXIAN_ENGINEER_VP } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Jamis',
      image: 'imperium_row/rise_of_ix/jamis.png',
      faction: [FactionType.FREMEN],
      agentIcons: [AgentIcon.FREMEN],
      cost: 2,
      riseOfIx: true,
      infiltrate: true,
      playEffect: [{ reward: { trash: 1 } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Landing Rights',
      image: 'imperium_row/rise_of_ix/landing_rights.png',
      faction: [FactionType.SPACING_GUILD],
      agentIcons: [AgentIcon.CITY],
      cost: 4,
      riseOfIx: true,
      playEffect: [{ reward: { freighter: 1 } }],
      revealEffect: [{ reward: { persuasion: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Local Fence',
      image: 'imperium_row/rise_of_ix/local_fence.png',
      agentIcons: [AgentIcon.CITY],
      cost: 3,
      riseOfIx: true,
      playEffect: [
        {
          cost: { spice: 2 },
          reward: { solari: 5 },
          choiceOpt: true,
        },
        {
          cost: { solari: 5 },
          reward: { spice: 4 },
          choiceOpt: true,
        },
      ],
      revealEffect: [{ reward: { persuasion: 2 } }],
    },
  },
  {
    qty: 2,
    card: {
      name: 'Negotiated Withdrawel',
      image: 'imperium_row/rise_of_ix/negotiated_withdrawel.png',
      agentIcons: [AgentIcon.SPICE_TRADE, AgentIcon.LANDSRAAD, AgentIcon.CITY],
      cost: 4,
      riseOfIx: true,
      acquireEffect: { troops: 1 },
      revealEffect: [
        { reward: { persuasion: 2 } },
        { reward: { custom: CustomEffect.NEGOTIATED_WITHDRAWAL } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Satellite Ban',
      image: 'imperium_row/rise_of_ix/satellite_ban.png',
      faction: [FactionType.SPACING_GUILD, FactionType.FREMEN],
      agentIcons: [AgentIcon.SPACING_GUILD, AgentIcon.FREMEN],
      cost: 5,
      riseOfIx: true,
      playEffect: [
        {
          cost: { discard: 1 },
          reward: { spice: 1, water: 1 },
        },
      ],
      revealEffect: [
        { reward: { persuasion: 1 } },
        { reward: { retreatTroops: 2 } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Sayyadina',
      image: 'imperium_row/rise_of_ix/sayyadina.png',
      faction: [FactionType.BENE_GESSERIT, FactionType.FREMEN],
      agentIcons: [AgentIcon.BENE_GESSERIT, AgentIcon.FREMEN],
      cost: 3,
      riseOfIx: true,
      playEffect: [
        {
          cost: { water: 3 },
          reward: { victoryPoints: 1 },
        },
      ],
      revealEffect: [
        {
          requirement: { bond: FactionType.FREMEN },
          reward: { persuasion: 3 },
        },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Shai-Hulud',
      image: 'imperium_row/rise_of_ix/shai_hulud.png',
      faction: [FactionType.FREMEN],
      agentIcons: [AgentIcon.SPICE_TRADE],
      cost: 7,
      riseOfIx: true,
      acquireEffect: { trash: 1 },
      playEffect: [
        {
          cost: { trash: 1 },
          reward: { troops: 2 },
        },
      ],
      revealEffect: [
        {
          requirement: { bond: FactionType.FREMEN },
          reward: { combat: 5 },
        },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Spice Trader',
      image: 'imperium_row/rise_of_ix/spice_trader.png',
      faction: [FactionType.FREMEN],
      agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 4,
      riseOfIx: true,
      playEffect: [
        {
          requirement: { influence: { faction: FactionType.FREMEN, amount: 2 } },
          cost: { discard: 1 },
          reward: { spice: 2 },
        },
      ],
      revealEffect: [{ reward: { persuasion: 2, combat: 1 } }],
    },
  },
  {
    qty: 2,
    card: {
      name: 'Treachery',
      image: 'imperium_row/rise_of_ix/treachery.png',
      agentIcons: [
        AgentIcon.EMPEROR,
        AgentIcon.SPACING_GUILD,
        AgentIcon.BENE_GESSERIT,
        AgentIcon.FREMEN,
      ],
      cost: 6,
      riseOfIx: true,
      unload: true,
      playEffect: [
        {
          reward: { custom: CustomEffect.TREACHERY_DOUBLE_INFLUENCE },
        },
        {
          reward: { trashThisCard: true },
        },
      ],
      revealEffect: [
        {
          reward: { troops: 2, deployTroops: 2 },
        },
      ],
    },
  },
  {
    qty: 2,
    card: {
      name: 'Truthsayer',
      image: 'imperium_row/rise_of_ix/truthsayer.png',
      faction: [FactionType.EMPEROR, FactionType.BENE_GESSERIT],
      agentIcons: [AgentIcon.EMPEROR, AgentIcon.BENE_GESSERIT, AgentIcon.LANDSRAAD],
      cost: 3,
      riseOfIx: true,
      playEffect: [
        {
          cost: { discard: 1 },
          reward: { drawCards: 1 },
        },
      ],
      revealEffect: [{ reward: { persuasion: 1, combat: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Water Peddler',
      image: 'imperium_row/rise_of_ix/water_peddler.png',
      agentIcons: [],
      cost: 1,
      riseOfIx: true,
      unload: true,
      acquireEffect: { water: 1 },
      revealEffect: [{ reward: { water: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Web of Power',
      image: 'imperium_row/rise_of_ix/web_of_power.png',
      faction: [FactionType.BENE_GESSERIT],
      agentIcons: [AgentIcon.BENE_GESSERIT],
      cost: 4,
      riseOfIx: true,
      infiltrate: true,
      playEffect: [{ reward: { custom: CustomEffect.WEB_OF_POWER } }],
      revealEffect: [
        { reward: { persuasion: 1 } },
        { reward: { influence: ANY_FACTION_INFLUENCE } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Weirding Way',
      image: 'imperium_row/rise_of_ix/weirding_way.png',
      faction: [FactionType.BENE_GESSERIT],
      agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 3,
      riseOfIx: true,
      playEffect: [{ reward: { custom: CustomEffect.WEIRDING_WAY_EXTRA_TURN } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 2 } }],
    },
  },
]

export const RISE_OF_IX_IMPERIUM_DECK: Card[] = expandCopies(RISE_OF_IX_CARD_TEMPLATES)

/** Unique RoI imperium card names (for tests). */
export const RISE_OF_IX_UNIQUE_CARD_COUNT = RISE_OF_IX_CARD_TEMPLATES.length
