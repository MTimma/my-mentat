import { Leader } from '../types/GameTypes'

export const LEADERS: Leader[] = [
  {
    name: "Earl Memnon Thorvald",
    ability: {
      name: "Master Strategist",
      description: "When you acquire a card with at least one sword icon, you may trash a card from your hand."
    },
    signetRing: "You may trash a card from your hand.",
    complexity: 1
  },
  {
    name: "Count Ilban Richese",
    ability: {
      name: "Technological Superiority",
      description: "When you acquire a card, you may pay 1 Solari to draw a card."
    },
    signetRing: "Pay 1 Solari to draw a card.",
    complexity: 1
  },
  {
    name: "Countess Ariana Thorvald",
    ability: {
      name: "Subtle Manipulator",
      description: "When you acquire a card with at least one persuasion, gain 1 Solari."
    },
    signetRing: "Gain 1 Solari.",
    complexity: 1
  },
  {
    name: "Helena Richese",
    ability: {
      name: "Supply Master",
      description: "When you acquire a card, you may pay 2 Spice to gain 2 Solari and 1 Water."
    },
    signetRing: "Pay 2 Spice to gain 2 Solari and 1 Water.",
    complexity: 2
  }
] 