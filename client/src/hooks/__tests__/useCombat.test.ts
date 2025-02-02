import { renderHook, act } from '@testing-library/react-hooks'
import { GameProvider } from '../../contexts/GameContext'
import { useCombat } from '../useCombat'

describe('useCombat', () => {
  const wrapper = ({ children }) => (
    <GameProvider initialState={mockGameState}>
      {children}
    </GameProvider>
  )

  it('calculates combat strength correctly', () => {
    const { result } = renderHook(() => useCombat(), { wrapper })
    
    expect(result.current.getCombatStrength(1)).toBe(4) // 2 troops * 2
    expect(result.current.getCombatStrength(2)).toBe(2) // 1 troop * 2
  })

  it('determines player ranks correctly', () => {
    const { result } = renderHook(() => useCombat(), { wrapper })
    
    expect(result.current.getPlayerRank(1)).toBe(1)
    expect(result.current.getPlayerRank(2)).toBe(2)
  })

  it('tracks combat passes', () => {
    const { result } = renderHook(() => useCombat(), { wrapper })
    
    act(() => {
      result.current.passCombat(1)
    })
    
    expect(result.current.hasConsecutivePasses()).toBe(false)
    
    act(() => {
      result.current.passCombat(2)
    })
    
    expect(result.current.hasConsecutivePasses()).toBe(true)
  })

  it('identifies eligible players correctly', () => {
    const { result } = renderHook(() => useCombat(), { wrapper })
    
    expect(result.current.eligiblePlayers).toHaveLength(2)
    expect(result.current.eligiblePlayers[0].id).toBe(1)
  })

  it('handles turn order correctly', () => {
    const { result } = renderHook(() => useCombat(), { wrapper })
    
    expect(result.current.currentCombatPlayer?.id).toBe(1) // First player starts
    
    act(() => {
      result.current.passCombat(1)
    })
    
    expect(result.current.currentCombatPlayer?.id).toBe(2) // Next player's turn
  })

  it('resets passes when a card is played', () => {
    const { result } = renderHook(() => useCombat(), { wrapper })
    
    act(() => {
      result.current.passCombat(1)
    })
    
    act(() => {
      result.current.playCombatIntrigue(2, 1) // Player 2 plays a card
    })
    
    expect(result.current.hasConsecutivePasses()).toBe(false)
  })

  it('calculates final rankings correctly', () => {
    const { result } = renderHook(() => useCombat(), { wrapper })
    
    expect(result.current.getPlayerRank(1)).toBe(1) // Highest strength
    expect(result.current.getPlayerRank(2)).toBe(2) // Second place
    expect(result.current.getPlayerRank(3)).toBeNull() // Not in combat
  })
}) 