import { IntrigueCard, IntrigueCardType } from '../types/GameTypes'

export const intrigueCards: IntrigueCard[] = [
  {
    id: 1,
    name: "Ambush",
    type: IntrigueCardType.COMBAT,
    description: "Add 4 strength to your combat total.",
    effect: {
      strengthBonus: 4
    },
  },
  {
    id: 2,
    name: "Secret Alliance",
    type: IntrigueCardType.PLOT,
    description: "Gain 2 influence with any faction.",
    effect: {
      gainInfluence: {
        faction: null, // Will be chosen when played
        amount: 2
      }
    },
  },
  {
    id: 3,
    name: "Sabotage",
    type: IntrigueCardType.COMBAT,
    description: "Remove 2 enemy troops from the conflict.",
    effect: {
      removeEnemyTroops: 2,
      targetPlayer: true
    },
  },
  {
    id: 4,
    name: "Spice Cache",
    type: IntrigueCardType.PLOT,
    description: "Gain 3 spice.",
    effect: {
      gainResource: {
        type: 'spice',
        amount: 3
      }
    },
  },
  {
    id: 5,
    name: "Blackmail",
    type: IntrigueCardType.PLOT,
    description: "Steal 2 solari from another player.",
    effect: {
      stealResource: {
        type: 'solari',
        amount: 2
      },
      targetPlayer: true
    },
  },
  {
    id: 6,
    name: "Strategic Planning",
    type: IntrigueCardType.COMBAT,
    description: "Draw 2 cards when you win a conflict.",
    effect: {
      drawCards: 2,
      playCondition: 'onWinCombat'
    },
  },
  // TODO Add more cards...
]

export class IntrigueDeckService {
  private deck: IntrigueCard[]
  private discardPile: IntrigueCard[]

  constructor() {
    this.deck = [...intrigueCards]
    this.discardPile = []
    this.shuffle()
  }

  private shuffle(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]
    }
  }

  drawCard(): IntrigueCard | null {
    if (this.deck.length === 0) {
      if (this.discardPile.length === 0) return null
      this.deck = [...this.discardPile]
      this.discardPile = []
      this.shuffle()
    }
    return this.deck.pop() || null
  }

  discardCard(card: IntrigueCard): void {
    this.discardPile.push(card)
  }

  getDeckSize(): number {
    return this.deck.length
  }

  getDiscardSize(): number {
    return this.discardPile.length
  }
} 