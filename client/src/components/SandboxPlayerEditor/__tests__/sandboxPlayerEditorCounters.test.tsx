// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import SandboxPlayerEditor from '../SandboxPlayerEditor'
import { makePlayer } from '../../GameContext/__tests__/_helpers'
import {
  ControlMarkerType,
  FactionType,
  NO_EXPANSIONS,
  type Player,
} from '../../../types/GameTypes'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const CONTROL_MARKERS = {
  [ControlMarkerType.ARRAKIN]: null,
  [ControlMarkerType.CARTHAG]: null,
  [ControlMarkerType.IMPERIAL_BASIN]: null,
}

const INFLUENCE = {
  [FactionType.EMPEROR]: 0,
  [FactionType.SPACING_GUILD]: 0,
  [FactionType.BENE_GESSERIT]: 0,
  [FactionType.FREMEN]: 0,
}

let latestPlayer: Player | null = null

function Harness({ initial }: { initial: Player }) {
  const [player, setPlayer] = useState(initial)
  const [influence, setInfluence] = useState(INFLUENCE)
  latestPlayer = player
  return (
    <SandboxPlayerEditor
      player={player}
      expansions={NO_EXPANSIONS}
      usedLeaderNames={[]}
      imperiumDeckCards={[]}
      arrakisLiaisonCards={[]}
      spiceMustFlowCards={[]}
      foldspaceCards={[]}
      controlMarkers={CONTROL_MARKERS}
      mentatOwner={null}
      playerInfluence={influence}
      players={[player]}
      onUpdate={patch => setPlayer(prev => ({ ...prev, ...patch }))}
      onInfluenceUpdate={(faction, value) =>
        setInfluence(prev => ({ ...prev, [faction]: value }))
      }
      onSetControl={() => {}}
      onSetDreadnoughtControl={() => {}}
      onSetMentatOwner={() => {}}
      onClose={() => {}}
    />
  )
}

function renderEditor(initial: Player) {
  latestPlayer = null
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<Harness initial={initial} />)
  })
  return {
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function click(el: Element | null) {
  expect(el).not.toBeNull()
  act(() => {
    ;(el as HTMLElement).click()
  })
}

function counterValue(label: string): string | null {
  const increase = document.querySelector(`[aria-label="Increase ${label}"]`)
  const stepper = increase?.closest('.value-stepper')
  return stepper?.querySelector('.value-stepper__value')?.textContent ?? null
}

describe('Sandbox player editor counters', () => {
  it('updates the visible value immediately and commits the player change', () => {
    const { cleanup } = renderEditor(makePlayer(0, { spice: 10 }))
    try {
      click(document.querySelector('.sandbox-player-editor__advanced'))
      expect(counterValue('Spice')).toBe('10')

      click(document.querySelector('[aria-label="Increase Spice"]'))
      expect(counterValue('Spice')).toBe('11')
      expect(latestPlayer?.spice).toBe(11)

      click(document.querySelector('[aria-label="Increase Spice"]'))
      expect(counterValue('Spice')).toBe('12')
      expect(latestPlayer?.spice).toBe(12)

      click(document.querySelector('[aria-label="Decrease Spice"]'))
      expect(counterValue('Spice')).toBe('11')
      expect(latestPlayer?.spice).toBe(11)
    } finally {
      cleanup()
    }
  })

  it('does not let the deferred player update overwrite newer counter clicks', () => {
    const { cleanup } = renderEditor(makePlayer(0, { spice: 10 }))
    try {
      click(document.querySelector('.sandbox-player-editor__advanced'))
      expect(counterValue('Spice')).toBe('10')
      // The counter must not be overwritten by the deferred player update.
      click(document.querySelector('[aria-label="Increase Spice"]'))
      click(document.querySelector('[aria-label="Increase Spice"]'))
      expect(counterValue('Spice')).toBe('12')
    } finally {
      cleanup()
    }
  })
})
