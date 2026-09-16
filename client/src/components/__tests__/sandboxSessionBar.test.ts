import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Sandbox session bar', () => {
  const barTsx = readFileSync(
    resolve(__dirname, '../SandboxSessionBar/SandboxSessionBar.tsx'),
    'utf8'
  )
  const appTsx = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8')
  const gamesListTsx = readFileSync(resolve(__dirname, '../GamesList/GamesList.tsx'), 'utf8')
  const autosaveTsx = readFileSync(
    resolve(__dirname, '../LocalGameAutosave/LocalGameAutosave.tsx'),
    'utf8'
  )

  it('exposes kit, start, browse, and a setup slot under the kit row', () => {
    expect(barTsx).toContain('Expansions')
    expect(barTsx).toContain('New')
    expect(barTsx).toContain('{!showKit ? (')
    expect(barTsx).toContain('Browse')
    expect(barTsx).toContain('sandbox-session-bar__actions')
    expect(barTsx).toContain('sandbox-session-bar__setup')
  })

  it('is mounted on the sandbox play shell, not GameSetup', () => {
    expect(appTsx).toContain('<SandboxSessionBar')
    expect(appTsx).not.toMatch(/screenState === ScreenState\.SETUP && \(/)
  })

  it('boots drafts from IndexedDB and lists This browser in Browse', () => {
    expect(appTsx).toContain('getActiveLocalGameId')
    expect(appTsx).toContain('persistLocalDraft')
    expect(appTsx).toContain('handleSandboxBegun')
    expect(appTsx).toContain('onSandboxBegun')
    expect(appTsx).toContain('adoptLocalDraft')
    expect(appTsx).toContain('replaceCurrentSandbox')
    expect(appTsx).not.toContain('startNewSandbox')
    expect(appTsx).not.toContain('saveGameJson')
    expect(appTsx).not.toContain('createGameJson')
    expect(appTsx).not.toContain('fetchActiveGame')
    expect(appTsx).not.toContain('adoptLoadedGame')
    expect(autosaveTsx).toContain('upsertLocalGame')
    expect(autosaveTsx).toContain('localGameId')
    expect(autosaveTsx).not.toContain('saveGameJson')
    expect(barTsx).toContain('onStartNew')
    expect(barTsx).toContain('Change expansions? The board will reset.')
    expect(barTsx).not.toContain('Load this game? The started game will be lost.')
    expect(barTsx).not.toContain('LOAD_CONFIRM')
    expect(gamesListTsx).toContain('Local')
    expect(gamesListTsx).toContain("useState<GamesListTab>('community')")
    expect(gamesListTsx).toContain('listLocalGames')
    expect(gamesListTsx).toContain('deleteLocalGame')
    expect(gamesListTsx).toContain('Copy error')
    expect(gamesListTsx).toContain('games-list-error--copyable')
    expect(appTsx).toContain('setupSlot={sandboxSetupControls(true)}')
    expect(appTsx).toContain('showKit={inSandboxSetup}')
  })

  it('docks into the turn-history sidebar on wide layouts', () => {
    expect(appTsx).toContain('sandboxBarInHistoryDock')
    expect(appTsx).toContain('topSlot={sandboxBarInHistoryDock ? sandboxSessionBarEl : undefined}')
    expect(appTsx).toContain('sandboxBarInPlayAreaDock')
    expect(appTsx).toContain(
      'sandboxBarInPlayAreaDock ? sandboxSessionBarEl : undefined'
    )
    expect(appTsx).toContain(
      '{!sandboxBarInHistoryDock && !sandboxBarInPlayAreaDock ? sandboxSessionBarEl : null}'
    )
    expect(barTsx).toContain('docked')
    const barCss = readFileSync(
      resolve(__dirname, '../SandboxSessionBar/SandboxSessionBar.css'),
      'utf8'
    )
    expect(barCss).toContain('appearance: none')
    expect(barCss).toMatch(/\.sandbox-session-bar__select \{[\s\S]*?width: 100%/)
    expect(barCss).not.toContain('field-sizing: content')
    expect(barCss).not.toContain('width: max-content')
    expect(barCss).toContain('.sandbox-session-bar--docked .sandbox-session-bar__select')
    expect(barCss).toMatch(
      /\.sandbox-session-bar--docked \.sandbox-session-bar__select \{[\s\S]*?width: 100%/
    )
    expect(barCss).not.toContain('flex: 1 1 14rem')
    expect(barCss).toContain('.sandbox-session-bar--docked')
    expect(barCss).toContain('.image-board__play-area-top-slot .sandbox-session-bar')
    expect(barCss).toMatch(
      /\.image-board__play-area-top-slot \.sandbox-session-bar__row \{[\s\S]*?flex-direction:\s*row/
    )
  })

  it('offsets the play shell below the notch in installed PWA', () => {
    const indexCss = readFileSync(resolve(__dirname, '../../index.css'), 'utf8')
    expect(indexCss).toContain('.game-container--play')
    expect(indexCss).toContain('padding-top: var(--pwa-safe-top)')
  })
})
