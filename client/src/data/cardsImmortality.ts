import { Card, AgentIcon, FactionType, CustomEffect, InfluenceAmounts } from '../types/GameTypes'

/**
 * Immortality cards (authoring source for the catalog).
 *
 * Agent-icon colour mapping (same as the spreadsheet / `cardsRiseOfIx.ts`):
 *   Gr → Landsraad, Bl → City, Yw → Spice Trade,
 *   EM/SG/BG/FR → the four faction icons.
 *
 * Many effects are declarative (`specimen` / `research` / `tleilaxu` / influence
 * rewards). Cards whose text depends on grafting, the other grafted card, or
 * research level use a `CustomEffect` (handlers in
 * `expansions/immortality/reducer.ts`). Text paraphrased from `.cursor/immortality`
 * and the card spreadsheet — verify against printed cards before relying on edge cases.
 */

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

const inf = (faction: FactionType, amount = 1): InfluenceAmounts => ({
  amounts: [{ faction, amount }],
})

const ANY_FACTION_INFLUENCE: InfluenceAmounts = {
  chooseOne: true,
  amounts: [
    { faction: FactionType.EMPEROR, amount: 1 },
    { faction: FactionType.SPACING_GUILD, amount: 1 },
    { faction: FactionType.BENE_GESSERIT, amount: 1 },
    { faction: FactionType.FREMEN, amount: 1 },
  ],
}

/** Immortality Imperium Row cards — 25 unique definitions, 30 instances. */
const IMMORTALITY_IMPERIUM_TEMPLATES: Array<{ card: Omit<Card, 'id'>; qty: number }> = [
  {
    qty: 1,
    card: {
      name: 'Bene Tleilax Lab',
      image: 'imperium_row/immortality/bene_tleilax_lab.png',
      agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 2,
      immortality: true,
      playEffect: [{ reward: { specimen: 1 } }],
      revealEffect: [
        { reward: { persuasion: 1 } },
        { requirement: { researchLevel: 1 }, reward: { spice: 1 } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Bene Tleilax Researcher',
      image: 'imperium_row/immortality/bene_tleilax_researcher.png',
      agentIcons: [AgentIcon.LANDSRAAD],
      cost: 4,
      immortality: true,
      graft: true,
      playEffect: [{ reward: { research: 1 } }],
      revealEffect: [
        { reward: { persuasion: 1 } },
        { requirement: { researchLevel: 1 }, reward: { persuasion: 1 } },
        { requirement: { researchLevel: 2 }, reward: { persuasion: 1 } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Blank Slate',
      image: 'imperium_row/immortality/blank_slate.png',
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 1,
      immortality: true,
      playEffect: [
        { requirement: { grafted: true }, reward: { custom: CustomEffect.BLANK_SLATE_ICONS } },
      ],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Clandestine Meeting',
      image: 'imperium_row/immortality/clandestine_meeting.png',
      faction: [FactionType.BENE_GESSERIT],
      agentIcons: [],
      cost: 4,
      immortality: true,
      // FAQ: needs an agent icon added (e.g. by grafting) to play on an Agent turn.
      playEffect: [
        {
          reward: {
            influence: inf(FactionType.BENE_GESSERIT),
            intrigueCards: 1,
            custom: CustomEffect.CLANDESTINE_MEETING,
          },
        },
      ],
      revealEffect: [{ reward: { persuasion: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Corrupt Smuggler',
      image: 'imperium_row/immortality/corrupt_smuggler.png',
      faction: [FactionType.SPACING_GUILD, FactionType.FREMEN],
      agentIcons: [AgentIcon.SPACING_GUILD, AgentIcon.SPICE_TRADE],
      cost: 3,
      immortality: true,
      playEffect: [{ requirement: { grafted: true }, reward: { spice: 2 } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 1 } }],
    },
  },
  {
    qty: 2,
    card: {
      name: 'Dissecting Kit',
      image: 'imperium_row/immortality/dissecting_kit.png',
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
      cost: 2,
      immortality: true,
      graft: true,
      // Trash other grafted card → +1 Specimen.
      playEffect: [{ reward: { custom: CustomEffect.DISSECTING_KIT } }],
      revealEffect: [
        { reward: { persuasion: 1 } },
        { requirement: { researchLevel: 1 }, reward: { tleilaxu: 1 } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'For Humanity',
      image: 'imperium_row/immortality/for_humanity.png',
      faction: [FactionType.BENE_GESSERIT],
      agentIcons: [AgentIcon.BENE_GESSERIT, AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
      cost: 7,
      immortality: true,
      playEffect: [{ reward: { influence: ANY_FACTION_INFLUENCE } }],
      // BG Alliance: -2 Inf → +1 VP (handled via reveal requirement + custom).
      revealEffect: [
        { reward: { persuasion: 2 } },
        {
          requirement: { alliance: FactionType.BENE_GESSERIT },
          cost: { influence: inf(FactionType.BENE_GESSERIT, 2) },
          reward: { victoryPoints: 1 },
        },
      ],
    },
  },
  {
    qty: 2,
    card: {
      name: 'High Priority Travel',
      image: 'imperium_row/immortality/high_priority_travel.png',
      faction: [FactionType.SPACING_GUILD],
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
      cost: 1,
      immortality: true,
      // If 2 inf with SG: this becomes a draw/combat space (custom).
      playEffect: [
        {
          requirement: { influence: { faction: FactionType.SPACING_GUILD, amount: 2 } },
          reward: { custom: CustomEffect.HIGH_PRIORITY_TRAVEL },
        },
      ],
      revealEffect: [{ reward: { persuasion: 1, solari: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Imperium Ceremony',
      image: 'imperium_row/immortality/imperium_ceremony.png',
      faction: [FactionType.EMPEROR, FactionType.SPACING_GUILD],
      agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.LANDSRAAD],
      cost: 6,
      immortality: true,
      // Look at top 2 Intrigues, keep one, other back on top (manual).
      playEffect: [{ reward: { custom: CustomEffect.IMPERIUM_CEREMONY } }],
      revealEffect: [{ reward: { persuasion: 3 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Interstellar Conspiracy',
      image: 'imperium_row/immortality/interstellar_conspiracy.png',
      agentIcons: [AgentIcon.CITY],
      cost: 4,
      immortality: true,
      graft: true,
      // +1 Sp; if grafted with EM/SG card: +1 Inf (any).
      playEffect: [
        { reward: { spice: 1 } },
        { requirement: { grafted: true }, reward: { influence: ANY_FACTION_INFLUENCE } },
      ],
      revealEffect: [{ reward: { persuasion: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Keys to Power',
      image: 'imperium_row/immortality/keys_to_power.png',
      faction: [FactionType.SPACING_GUILD, FactionType.BENE_GESSERIT],
      agentIcons: [AgentIcon.SPACING_GUILD, AgentIcon.BENE_GESSERIT, AgentIcon.LANDSRAAD],
      cost: 5,
      immortality: true,
      playEffect: [
        {
          requirement: { influence: { faction: FactionType.EMPEROR, amount: 2 } },
          reward: { spice: 2 },
        },
      ],
      revealEffect: [{ reward: { persuasion: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Lisan Al-Gaib',
      image: 'imperium_row/immortality/lisan_al_gaib.png',
      faction: [FactionType.BENE_GESSERIT, FactionType.FREMEN],
      agentIcons: [AgentIcon.FREMEN, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 4,
      immortality: true,
      acquireEffect: { spice: 1 },
      // +1 Inf FR if you have another BG card in play.
      playEffect: [{ reward: { custom: CustomEffect.LISAN_AL_GAIB } }],
      revealEffect: [{ requirement: { bond: FactionType.FREMEN }, reward: { combat: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Long Reach',
      image: 'imperium_row/immortality/long_reach.png',
      faction: [FactionType.BENE_GESSERIT],
      agentIcons: [],
      cost: 6,
      immortality: true,
      // +1 Inf with 2 factions; if BG in play: gains Gr/Bl/Yw icons (custom).
      playEffect: [{ reward: { custom: CustomEffect.LONG_REACH } }],
      revealEffect: [{ reward: { persuasion: 1, intrigueCards: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Occupation',
      image: 'imperium_row/immortality/occupation.png',
      faction: [FactionType.SPACING_GUILD],
      agentIcons: [
        AgentIcon.EMPEROR,
        AgentIcon.SPACING_GUILD,
        AgentIcon.BENE_GESSERIT,
        AgentIcon.FREMEN,
        AgentIcon.CITY,
        AgentIcon.SPICE_TRADE,
      ],
      cost: 8,
      immortality: true,
      acquireEffect: { troops: 3 },
      // 1x draw; this space becomes a combat space this turn (custom).
      playEffect: [{ reward: { drawCards: 1, custom: CustomEffect.OCCUPATION_COMBAT } }],
      revealEffect: [{ reward: { water: 1, spice: 1, troops: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Organ Merchants',
      image: 'imperium_row/immortality/organ_merchants.png',
      agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 3,
      immortality: true,
      // 1 Specimen → +4 Solari.
      playEffect: [{ cost: { specimen: 1 }, reward: { solari: 4 } }],
      revealEffect: [{ reward: { persuasion: 1, solari: 1 } }],
    },
  },
  {
    qty: 2,
    card: {
      name: 'Planned Coupling',
      image: 'imperium_row/immortality/planned_coupling.png',
      faction: [FactionType.BENE_GESSERIT],
      agentIcons: [AgentIcon.BENE_GESSERIT],
      cost: 3,
      immortality: true,
      graft: true,
      playEffect: [{ reward: { drawCards: 1 } }],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Replacement Eyes',
      image: 'imperium_row/immortality/replacement_eyes.png',
      agentIcons: [AgentIcon.CITY],
      cost: 5,
      immortality: true,
      graft: true,
      // 1x trash → 1x draw. When this card trashed: +1 Tleilaxu (beetle).
      playEffect: [{ reward: { trash: 1, drawCards: 1 } }],
      trashEffect: [{ reward: { tleilaxu: 1, custom: CustomEffect.REPLACEMENT_EYES_TRASH_BEETLE } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Sardukar Quartermaster',
      image: 'imperium_row/immortality/sarduakar_quartermaster.png',
      faction: [FactionType.EMPEROR],
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
      cost: 2,
      immortality: true,
      // If grafted: +1 Troop, 1x draw.
      playEffect: [
        { requirement: { grafted: true }, reward: { troops: 1, drawCards: 1 } },
      ],
      revealEffect: [{ reward: { persuasion: 1, combat: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Shadout Mapes',
      image: 'imperium_row/immortality/shadout_mapes.png',
      faction: [FactionType.FREMEN],
      agentIcons: [AgentIcon.FREMEN, AgentIcon.SPICE_TRADE],
      cost: 2,
      immortality: true,
      revealEffect: [
        { reward: { persuasion: 1, combat: 1 } },
        // May deploy or retreat 1 of your troops.
        { reward: { custom: CustomEffect.SHADOUT_MAPES } },
      ],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Show of Strength',
      image: 'imperium_row/immortality/show_of_strength.png',
      faction: [FactionType.EMPEROR, FactionType.FREMEN],
      agentIcons: [],
      cost: 3,
      immortality: true,
      // 2x draw; if more deployed troops than each opp: gains Gr/Yw icons (custom).
      playEffect: [{ reward: { drawCards: 2, custom: CustomEffect.SHOW_OF_STRENGTH } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 2 } }],
    },
  },
  {
    qty: 2,
    card: {
      name: 'Spiritual Fervor',
      image: 'imperium_row/immortality/spiritual_fervor.png',
      agentIcons: [AgentIcon.SPICE_TRADE],
      cost: 3,
      immortality: true,
      acquireEffect: {}, // 1 Research on acquire (handled via custom acquire below)
      playEffect: [{ reward: { research: 1 } }],
      revealEffect: [{ reward: { persuasion: 1, specimen: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Stillsuit Manufacturer',
      image: 'imperium_row/immortality/stillsuit_manufacturer.png',
      faction: [FactionType.FREMEN],
      agentIcons: [AgentIcon.FREMEN, AgentIcon.CITY],
      cost: 5,
      immortality: true,
      // +1 Wa; if FR Alliance: return this from play to hand (custom).
      playEffect: [
        { reward: { water: 1 } },
        {
          requirement: { alliance: FactionType.FREMEN },
          reward: { custom: CustomEffect.STILLSUIT_MANUFACTURER },
        },
      ],
      revealEffect: [{ requirement: { bond: FactionType.FREMEN }, reward: { spice: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Throne Room Politics',
      image: 'imperium_row/immortality/throne_room_politics.png',
      faction: [FactionType.EMPEROR, FactionType.BENE_GESSERIT],
      agentIcons: [AgentIcon.EMPEROR],
      cost: 4,
      immortality: true,
      playEffect: [{ reward: { troops: 1, trash: 1 } }],
      revealEffect: [{ reward: { influence: inf(FactionType.BENE_GESSERIT) } }],
    },
  },
  {
    qty: 2,
    card: {
      name: 'Tleilaxu Master',
      image: 'imperium_row/immortality/tleilaxu_master.png',
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
      cost: 5,
      immortality: true,
      // Res lvl 1: may acquire a cost-6 card. Res lvl 2: put it in hand (custom).
      playEffect: [
        { requirement: { researchLevel: 1 }, reward: { custom: CustomEffect.TLEILAXU_MASTER } },
      ],
      revealEffect: [{ reward: { research: 2 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Tleilaxu Surgeon',
      image: 'imperium_row/immortality/tleilaxu_surgeon.png',
      agentIcons: [AgentIcon.EMPEROR, AgentIcon.CITY],
      cost: 3,
      immortality: true,
      // 2 Specimen → 2 Tleilaxu (beetle).
      playEffect: [{ cost: { specimen: 2 }, reward: { tleilaxu: 2 } }],
      // Lose 2 troops → +2 Specimen.
      revealEffect: [
        { reward: { persuasion: 2 } },
        { cost: { troops: 2 }, reward: { specimen: 2 } },
      ],
    },
  },
]

/** Immortality Tleilaxu Row cards — 19 unique definitions (incl. Reclaimed Forces). */
const IMMORTALITY_TLEILAXU_TEMPLATES: Array<{ card: Omit<Card, 'id'>; qty: number }> = [
  {
    qty: 1,
    card: {
      name: 'Reclaimed Forces',
      image: 'tleilaxu_row/immortality/reclaimed_forces.png',
      agentIcons: [],
      cost: 3,
      immortality: true,
      tleilaxu: true,
      // Never removed from the row; choose recruit 2 troops or advance Tleilaxu track.
      playEffect: [{ reward: { custom: CustomEffect.RECLAIMED_FORCES } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Usurp',
      image: 'tleilaxu_row/immortality/usurp.png',
      agentIcons: [],
      cost: 4,
      immortality: true,
      tleilaxu: true,
      graft: true,
      playEffect: [{ reward: { custom: CustomEffect.USURP_GRAFT } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 1, specimen: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Twisted Mentat',
      image: 'tleilaxu_row/immortality/twisted_mentat.png',
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY],
      cost: 4,
      immortality: true,
      tleilaxu: true,
      graft: true,
      // May recall the agent you sent this turn.
      playEffect: [{ reward: { custom: CustomEffect.TWISTED_MENTAT_RECALL } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 1, specimen: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Beguiling Pheromones',
      image: 'tleilaxu_row/immortality/beguiling_pheromones.png',
      agentIcons: [AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 3,
      immortality: true,
      tleilaxu: true,
      graft: true,
      playEffect: [{ reward: { custom: CustomEffect.BEGUILING_PHEROMONES } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Stitched Horror',
      image: 'tleilaxu_row/immortality/stitched_horror.png',
      agentIcons: [AgentIcon.CITY],
      cost: 3,
      immortality: true,
      tleilaxu: true,
      graft: true,
      // Choose 2: +1 water, +1 troop, 1x trash, +1 beetle.
      playEffect: [{ reward: { custom: CustomEffect.STITCHED_HORROR } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Unnatural Reflexes',
      image: 'tleilaxu_row/immortality/unnatural_reflexes.png',
      agentIcons: [AgentIcon.SPICE_TRADE],
      cost: 3,
      immortality: true,
      tleilaxu: true,
      graft: true,
      playEffect: [{ requirement: { researchLevel: 1 }, reward: { drawCards: 2 } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Ghola',
      image: 'tleilaxu_row/immortality/ghola.png',
      agentIcons: [AgentIcon.CITY],
      cost: 3,
      immortality: true,
      tleilaxu: true,
      graft: true,
      // Copies the agent box of the other grafted card.
      playEffect: [{ reward: { custom: CustomEffect.GHOLA_COPY } }],
      revealEffect: [{ reward: { persuasion: 1, combat: 1, specimen: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Scientific Breakthrough',
      image: 'tleilaxu_row/immortality/scientific_breakthrough.png',
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.CITY, AgentIcon.SPICE_TRADE],
      cost: 3,
      immortality: true,
      tleilaxu: true,
      // +1 research; if research lvl 2: trash this → +1 VP.
      playEffect: [
        { reward: { research: 1 } },
        {
          requirement: { researchLevel: 2 },
          reward: { trashThisCard: true, victoryPoints: 1, custom: CustomEffect.SCIENTIFIC_BREAKTHROUGH },
        },
      ],
      revealEffect: [{ reward: { persuasion: 1, combat: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Slig Farmer',
      image: 'tleilaxu_row/immortality/slig_farmer.png',
      agentIcons: [AgentIcon.LANDSRAAD],
      cost: 2,
      immortality: true,
      tleilaxu: true,
      graft: true,
      // 5 solari → beetle; +1 solari for each agent icon on other grafted card.
      playEffect: [{ reward: { custom: CustomEffect.SLIG_FARMER } }],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'From the Tanks',
      image: 'tleilaxu_row/immortality/from_the_tanks.png',
      agentIcons: [AgentIcon.LANDSRAAD],
      cost: 2,
      immortality: true,
      tleilaxu: true,
      playEffect: [{ reward: { troops: 2 } }],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Face Dancer',
      image: 'tleilaxu_row/immortality/face_dancer.png',
      faction: [FactionType.EMPEROR, FactionType.SPACING_GUILD, FactionType.FREMEN],
      agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.FREMEN],
      cost: 2,
      immortality: true,
      tleilaxu: true,
      graft: true,
      playEffect: [{ reward: { drawCards: 1 } }],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Guild Impersonator',
      image: 'tleilaxu_row/immortality/guild_impersonator.png',
      faction: [FactionType.SPACING_GUILD],
      agentIcons: [AgentIcon.SPACING_GUILD],
      cost: 2,
      immortality: true,
      tleilaxu: true,
      graft: true,
      // If you gain spice this turn: +1 inf SG (custom).
      playEffect: [{ reward: { custom: CustomEffect.GUILD_IMPERSONATOR } }],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Chairdog',
      image: 'tleilaxu_row/immortality/chairdog.png',
      agentIcons: [AgentIcon.CITY],
      cost: 2,
      immortality: true,
      tleilaxu: true,
      graft: true,
      // At start of reveal, return the other grafted card from play to hand.
      playEffect: [{ reward: { custom: CustomEffect.CHAIRDOG_RETURN } }],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Tleilaxu Infiltrator',
      image: 'tleilaxu_row/immortality/tleilaxu_infiltrator.png',
      agentIcons: [AgentIcon.CITY],
      cost: 2,
      immortality: true,
      tleilaxu: true,
      graft: true,
      infiltrate: true,
      // Enemy agents don't block your agent this turn; 1x draw; if res lvl 2: +1 intrigue.
      playEffect: [
        { reward: { drawCards: 1 } },
        { requirement: { researchLevel: 2 }, reward: { intrigueCards: 1 } },
      ],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Subject X-137',
      image: 'tleilaxu_row/immortality/subject_x_137.png',
      agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
      cost: 2,
      immortality: true,
      tleilaxu: true,
      acquireEffect: {}, // +1 Beetle on acquire (custom acquire wiring in card task)
      // If res lvl 1: +1 Tleilaxu (beetle) / +1 water.
      playEffect: [
        { requirement: { researchLevel: 1 }, reward: { tleilaxu: 1, water: 1 } },
      ],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Corrino Genes',
      image: 'tleilaxu_row/immortality/corrino_genes.png',
      faction: [FactionType.EMPEROR],
      agentIcons: [AgentIcon.EMPEROR],
      cost: 1,
      immortality: true,
      tleilaxu: true,
      acquireEffect: {}, // +2 solari on acquire
      // If grafted: +1 Tleilaxu (beetle).
      playEffect: [{ requirement: { grafted: true }, reward: { tleilaxu: 1 } }],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Contaminator',
      image: 'tleilaxu_row/immortality/contaminator.png',
      faction: [FactionType.FREMEN],
      agentIcons: [AgentIcon.FREMEN],
      cost: 1,
      immortality: true,
      tleilaxu: true,
      playEffect: [{ reward: { tleilaxu: 1 } }],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Industrial Espionage',
      image: 'tleilaxu_row/immortality/industrial_espionage.png',
      agentIcons: [AgentIcon.LANDSRAAD],
      cost: 1,
      immortality: true,
      tleilaxu: true,
      // 1x draw; if grafted: +1 research and +1 specimen.
      playEffect: [
        { reward: { drawCards: 1 } },
        { requirement: { grafted: true }, reward: { research: 1, specimen: 1 } },
      ],
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
  {
    qty: 1,
    card: {
      name: 'Face Dancer Initiate',
      image: 'tleilaxu_row/immortality/face_dancer_initiate.png',
      faction: [FactionType.EMPEROR, FactionType.SPACING_GUILD, FactionType.FREMEN],
      agentIcons: [AgentIcon.EMPEROR, AgentIcon.SPACING_GUILD, AgentIcon.FREMEN],
      cost: 1,
      immortality: true,
      tleilaxu: true,
      graft: true,
      revealEffect: [{ reward: { persuasion: 1 } }],
    },
  },
]

/**
 * Immortality starter card. Replaces the two `Dune, the Desert Planet` cards in
 * each player's starting deck (handled declaratively via a game-pack `replace`
 * deck patch — not a hardcoded swap in base setup).
 *
 * Card text / art: https://www.duneimperiumassets.com/assets/imperium_card/Experimentation
 * - Agent (Landsraad): +1 Research
 * - Reveal: +1 Persuasion, +1 Specimen
 */
const IMMORTALITY_STARTING_TEMPLATES: Array<{ card: Omit<Card, 'id'>; qty: number }> = [
  {
    qty: 1,
    card: {
      name: 'Experimentation',
      image: 'starter_deck/experimentation.png',
      agentIcons: [AgentIcon.LANDSRAAD],
      immortality: true,
      playEffect: [{ reward: { research: 1 } }],
      revealEffect: [{ reward: { persuasion: 1, specimen: 1 } }],
    },
  },
]

export const IMMORTALITY_IMPERIUM_DECK: Card[] = expandCopies(IMMORTALITY_IMPERIUM_TEMPLATES)
export const IMMORTALITY_TLEILAXU_DECK: Card[] = expandCopies(IMMORTALITY_TLEILAXU_TEMPLATES)
export const IMMORTALITY_STARTING_DECK: Card[] = expandCopies(IMMORTALITY_STARTING_TEMPLATES)
