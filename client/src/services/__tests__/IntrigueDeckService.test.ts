import { IntrigueDeckService, intrigueCards } from '../IntrigueDeckService'
import { IntrigueCardType } from '../../types/GameTypes'

describe('IntrigueDeckService', () => {
  let service: IntrigueDeckService

  beforeEach(() => {
    service = new IntrigueDeckService()
  })

  it('initializes with all cards shuffled', () => {
    expect(service.getDeckSize()).toBe(intrigueCards.length)
    expect(service.getDiscardSize()).toBe(0)
  })

  it('draws cards correctly', () => {
    const card = service.drawCard()
    expect(card).toBeTruthy()
    expect(service.getDeckSize()).toBe(intrigueCards.length - 1)
  })

  it('reshuffles discard pile when deck is empty', () => {
    const totalCards = service.getDeckSize()
    
    // Draw all cards
    for (let i = 0; i < totalCards; i++) {
      const card = service.drawCard()
      if (card) service.discardCard(card)
    }

    expect(service.getDeckSize()).toBe(0)
    expect(service.getDiscardSize()).toBe(totalCards)

    // Draw one more card
    const newCard = service.drawCard()
    expect(newCard).toBeTruthy()
    expect(service.getDeckSize()).toBe(totalCards - 1)
    expect(service.getDiscardSize()).toBe(0)
  })
}) 