import { IntrigueCard, IntrigueCardType, FactionType } from '../types/GameTypes'

export const intrigueCards: IntrigueCard[] = [
  {
    id: 1,
    name: 'Ambush',
    type: IntrigueCardType.COMBAT,
    description: 'Add 4 strength to your combat total.',
    image: '/intrigue/base/ambush.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { combat: 4 }
      }
    ]
  },
  {
    id: 2,
    name: 'Bindu Suspension',
    type: IntrigueCardType.PLOT,
    description: 'Draw 2 cards.',
    image: '/intrigue/base/bindu_suspension.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { drawCards: 2 }
      }
    ]
  },
  {
    id: 3,
    name: 'Bribery',
    type: IntrigueCardType.PLOT,
    description: 'Gain 3 Solari.',
    image: '/intrigue/base/bribery.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { solari: 3 }
      }
    ]
  },
  {
    id: 4,
    name: 'Corner the Market',
    type: IntrigueCardType.PLOT,
    description: 'Gain 2 spice.',
    image: '/intrigue/base/corner_the_market.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { spice: 2 }
      }
    ]
  },
  {
    id: 5,
    name: 'Rapid Mobilization',
    type: IntrigueCardType.COMBAT,
    description: 'Deploy 3 troops immediately.',
    image: '/intrigue/base/rapid_mobilization.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { troops: 3 }
      }
    ]
  },
  {
    id: 6,
    name: 'Water of Life',
    type: IntrigueCardType.PLOT,
    description: 'Gain 1 water and draw 2 cards.',
    image: '/intrigue/base/water_of_life.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { water: 1, drawCards: 2 }
      }
    ]
  },
  {
    id: 7,
    name: 'Windfall',
    type: IntrigueCardType.PLOT,
    description: 'Gain 2 Solari.',
    image: '/intrigue/base/windfall.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { solari: 2 }
      }
    ]
  },
  {
    id: 8,
    name: 'Double Cross',
    type: IntrigueCardType.COMBAT,
    description: 'Gain 2 combat strength.',
    image: '/intrigue/base/double_cross.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { combat: 2 }
      }
    ]
  },
  {
    id: 9,
    name: 'To the Victor',
    type: IntrigueCardType.ENDGAME,
    description: 'Gain 1 victory point.',
    image: '/intrigue/base/to_the_victor.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { victoryPoints: 1 }
      }
    ]
  },
  {
    id: 10,
    name: 'Guild Authorization',
    type: IntrigueCardType.PLOT,
    description: 'Gain 1 influence with the Spacing Guild.',
    image: '/intrigue/base/guild_authorization.png',
    agentIcons: [],
    playEffect: [
      {
        reward: { influence: { amounts: [{ faction: FactionType.SPACING_GUILD, amount: 1 }] } }
      }
    ]
  }
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