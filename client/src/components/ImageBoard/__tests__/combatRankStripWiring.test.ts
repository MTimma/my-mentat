import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Source contracts for combat rank strip + seat deploy relocation.
 */
describe('Combat rank strip wiring', () => {
  const root = resolve(__dirname, '../../..')
  const imageBoard = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.tsx'), 'utf8')
  const cluster = readFileSync(resolve(root, 'components/ImageBoard/CombatAreaCluster.tsx'), 'utf8')
  const seatChrome = readFileSync(
    resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.tsx'),
    'utf8'
  )
  const anchors = readFileSync(resolve(root, 'data/boardMarkerAnchors.ts'), 'utf8')

  it('mounts CombatRankStrip on ImageBoard stage via COMBAT_RANK_STRIP_RECT (desktop + mobile)', () => {
    expect(imageBoard).toContain('COMBAT_RANK_STRIP_RECT')
    expect(imageBoard).toContain('image-board__combat-rank-strip')
    expect(imageBoard).toContain('percentToStyle(rankStripBox)')
    // No beneath-board / mobile-only strip mount.
    expect(imageBoard).not.toContain('variant="mobile"')
    expect(imageBoard).not.toContain('mobileCombatRankStrip')
    expect(imageBoard).not.toContain('image-board__combat-deploy-dock')
  })

  it('defines COMBAT_RANK_STRIP_RECT under RoI, capped vs mid-size 47/93/42/7', () => {
    expect(anchors).toContain('COMBAT_RANK_STRIP_RECT')
    expect(anchors).toMatch(/left:\s*40/)
    expect(anchors).toMatch(/top:\s*88/)
    expect(anchors).toMatch(/width:\s*60/)
    expect(anchors).toMatch(/height:\s*12/)
    const rect = anchors.match(
      /export const COMBAT_RANK_STRIP_RECT = \{[\s\S]*?width:\s*(\d+)[\s\S]*?height:\s*(\d+)/
    )
    expect(Number(rect?.[1])).toBeLessThanOrEqual(63)
    expect(Number(rect?.[2])).toBeLessThanOrEqual(14)
  })

  it('uses a constant 4-slot frame with podium labels above the boxes', () => {
    const css = readFileSync(
      resolve(root, 'components/ImageBoard/CombatRankStrip.css'),
      'utf8'
    )
    const strip = readFileSync(
      resolve(root, 'components/ImageBoard/CombatRankStrip.tsx'),
      'utf8'
    )
    const util = readFileSync(resolve(root, 'utils/combatRankStrip.ts'), 'utf8')
    expect(util).toContain('buildCombatRankSlots')
    expect(util).toContain('COMBAT_RANK_SLOT_COUNT = 4')
    expect(strip).toContain('buildCombatRankSlots')
    expect(strip).toContain('combat-rank-strip__slot')
    expect(strip).toContain('combat-rank-strip__slot-label')
    expect(strip).toContain('combat-rank-strip__chip--empty')
    expect(strip).toContain('data-slot-place')
    expect(strip).not.toContain('combat-rank-strip__place')
    expect(css).toContain('.combat-rank-strip__slot-label--1')
    expect(css).toContain('.combat-rank-strip__slot-label--2')
    expect(css).toContain('.combat-rank-strip__slot-label--3')
    expect(css).toContain('#f0d078')
    expect(css).toContain('#c5cdd6')
    expect(css).toContain('#d09258')
    expect(css).toContain('.combat-rank-strip__chip--empty')
    expect(css).not.toContain('.combat-rank-strip__place')
    expect(strip).toContain('combat-rank-strip__body')
    expect(strip).toContain('combat-rank-strip__forces')
    expect(strip).toContain('combat-rank-strip__rule')
    expect(strip).toContain('combat-rank-strip__strength')
    expect(strip).not.toContain('combat-rank-strip__color')
    expect(strip).not.toContain('combat-rank-strip__id')
    expect(strip).not.toContain('combat-rank-strip__stats')
    expect(css).not.toContain('combat-rank-strip__color')
    const chipFn = strip.slice(
      strip.indexOf('const CombatRankChip'),
      strip.indexOf('const CombatRankStrip:')
    )
    const leaderIdx = chipFn.indexOf('combat-rank-strip__leader')
    const strengthIdx = chipFn.indexOf('combat-rank-strip__strength')
    const ruleIdx = chipFn.indexOf('combat-rank-strip__rule')
    const forcesIdx = chipFn.indexOf('combat-rank-strip__forces')
    expect(leaderIdx).toBeGreaterThan(-1)
    expect(leaderIdx).toBeLessThan(strengthIdx)
    expect(strengthIdx).toBeLessThan(ruleIdx)
    expect(ruleIdx).toBeLessThan(forcesIdx)
  })

  it('fits four chips without scroll (flex-end, overflow hidden, no spacer)', () => {
    const css = readFileSync(
      resolve(root, 'components/ImageBoard/CombatRankStrip.css'),
      'utf8'
    )
    const strip = readFileSync(
      resolve(root, 'components/ImageBoard/CombatRankStrip.tsx'),
      'utf8'
    )
    expect(css).toContain('overflow: hidden')
    expect(css).not.toContain('overflow-x: auto')
    expect(css).not.toContain('.combat-rank-strip::before')
    expect(css).not.toContain('combat-rank-strip--scrollable')
    expect(css).toContain('justify-content: flex-end')
    expect(css).toMatch(/flex:\s*1 1 0/)
    expect(css).toContain('max-width: calc((100% - 0.36em) / 4)')
    expect(strip).not.toContain('scrollLeft')
    expect(strip).not.toContain('useLayoutEffect')
    expect(strip).not.toContain('ResizeObserver')
  })

  it('uses play-chrome theme tokens for chip fill/border, not a brown-only slab', () => {
    const css = readFileSync(
      resolve(root, 'components/ImageBoard/CombatRankStrip.css'),
      'utf8'
    )
    expect(css).toContain('var(--chrome-shell')
    expect(css).toContain('var(--chrome-accent-hover')
    expect(css).toContain('var(--chrome-accent-muted')
    expect(css).toContain('var(--chrome-border-accent-strong')
    expect(css).toMatch(/\.combat-rank-strip__chip \{[\s\S]*?border:\s*1px solid var\(--chrome-border-accent-strong/)
    expect(css).toMatch(
      /\.combat-rank-strip__chip--empty \{[\s\S]*?border:\s*1px dashed var\(--chrome-border-accent/
    )
    expect(css).not.toContain('rgba(8, 6, 4, 0.94)')
    expect(css).not.toContain('1px solid rgba(212, 177, 106, 0.55)')
    expect(css).not.toContain('background: rgba(0, 0, 0, 0.45)')
    expect(css).toContain('background: transparent')
    expect(css).toContain('font-size: clamp(9px, 1.55cqw, 14px)')
    expect(css).toContain('text-shadow: 0 0 3px rgba(0, 0, 0, 0.9), 0 1px 2px #000')
    expect(css).toMatch(/\.combat-rank-strip__leader \{[\s\S]*?border-radius:\s*2px/)
    expect(css).not.toMatch(/\.combat-rank-strip__leader \{[\s\S]*?border-radius:\s*50%/)
    expect(css).not.toMatch(
      /\.combat-rank-strip__leader-icon,\s*\n\s*\.combat-rank-strip__leader-fallback \{[\s\S]*?border-radius:\s*50%/
    )
    const portraitSize = css.match(
      /\.combat-rank-strip__leader \{[\s\S]*?width:\s*(\d+)cqh/
    )
    expect(Number(portraitSize?.[1])).toBeGreaterThan(42)
    expect(css).toMatch(/\.combat-rank-strip__forces \.combat-rank-strip__icon \{[\s\S]*?width:\s*34cqh/)
    expect(css).toContain('min-width: 2ch')
    expect(css).toMatch(/\.combat-rank-strip__forces \{[\s\S]*?flex-direction:\s*row/)
    expect(css).toMatch(
      /\.combat-rank-strip__value--strength \{[\s\S]*?min-width:\s*2ch/
    )
    const troopNum = css.match(
      /\.combat-rank-strip__forces \.combat-rank-strip__value \{[\s\S]*?font-size:\s*(\d+)cqh/
    )
    const strengthNum = css.match(
      /\.combat-rank-strip__value--strength \{[\s\S]*?font-size:\s*(\d+)cqh/
    )
    const troopIcon = css.match(
      /\.combat-rank-strip__forces \.combat-rank-strip__icon \{[\s\S]*?width:\s*(\d+)cqh/
    )
    expect(Number(troopNum?.[1])).toBeGreaterThan(24)
    expect(Number(troopIcon?.[1])).toBeGreaterThan(32)
    expect(Number(strengthNum?.[1])).toBeGreaterThan(Number(troopNum?.[1]))
    expect(css).toContain('dreadnought-icon--card')
    expect(css).toContain('.combat-rank-strip__rule')
    expect(css).toContain('.combat-rank-strip__strength')
    expect(css).not.toContain('rgba(2, 3, 5, 0.78)')
    expect(css).not.toContain('rgba(8, 7, 6, 0.9)')
  })

  it('removes under-leader PlayerCombatSlot from CombatAreaCluster', () => {
    expect(cluster).not.toContain('PlayerCombatSlot')
    expect(cluster).not.toContain('CombatStatusStrip')
  })

  it('renders deploy controls under End Turn / intrigue / tech on desktop', () => {
    expect(seatChrome).toContain('BirdseyeSeatDeployControls')
    expect(seatChrome).toContain('CombatDeployDock')
    expect(seatChrome).toContain('birdseye-seat__deploy')
    const desktopIdx = seatChrome.indexOf('export function BirdseyeDesktopControls')
    const desktopBlock = seatChrome.slice(desktopIdx, desktopIdx + 1600)
    expect(desktopBlock.indexOf('birdseye-seat__controls-stack')).toBeLessThan(
      desktopBlock.indexOf('BirdseyeSeatDeployControls')
    )
    expect(desktopBlock.indexOf('BirdseyeUtilControls')).toBeLessThan(
      desktopBlock.indexOf('BirdseyeSeatDeployControls')
    )
    expect(imageBoard).toContain('troopDeploy={troopDeploy}')
  })

  it('keeps mobile seats as identity + resources/gains (actions live in play area)', () => {
    const mobileIdx = cluster.indexOf("birdseyeMode === 'mobile3b'")
    const desktopIdx = cluster.indexOf('/* desktop6 */')
    const mobileBlock = cluster.slice(mobileIdx, desktopIdx > mobileIdx ? desktopIdx : mobileIdx + 2500)
    expect(mobileBlock).not.toContain('BirdseyePortraitOverlay')
    expect(mobileBlock).not.toContain('combat-area-cluster__seat-top')
    expect(mobileBlock).not.toContain('BirdseyeRimBar')
    expect(mobileBlock).toContain('combat-area-cluster__seat-chrome')
    expect(mobileBlock).toContain('BirdseyeSeatGains')
    expect(cluster).not.toContain('showMobileRim')
    const seatCss = readFileSync(
      resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'),
      'utf8'
    )
    expect(seatCss).not.toContain('top: 38%')
    expect(seatCss).not.toContain("on the leader art, not the name plate")
  })

  it('crops mobile portraits and puts resources/gains under the face', () => {
    const seatCss = readFileSync(
      resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'),
      'utf8'
    )
    const chrome = seatCss.match(
      /\.combat-area-cluster--row \.combat-area-cluster__seat--birdseye \.combat-area-cluster__seat-chrome \{[\s\S]*?\}/
    )?.[0]
    expect(chrome).toBeTruthy()
    expect(chrome).toContain('height: var(--birdseye-face-size, 72px)')
    expect(chrome).not.toContain('clamp(10rem, 40vw, 14.5rem)')
    const birdseyeSeat = seatCss.match(
      /\.combat-area-cluster--row \.combat-area-cluster__seat--birdseye \{[\s\S]*?\}/
    )?.[0]
    expect(birdseyeSeat).toContain('height: auto')
    expect(seatCss).not.toContain('height: 4.6rem')
    expect(cluster).not.toContain('birdseye-seat__portrait-dock')
    const mobileIdx = cluster.indexOf("birdseyeMode === 'mobile3b'")
    const desktopIdx = cluster.indexOf('/* desktop6 */')
    const mobileBlock = cluster.slice(mobileIdx, desktopIdx > mobileIdx ? desktopIdx : mobileIdx + 2500)
    expect(mobileBlock).toContain('combat-area-cluster__seat-meta')
    expect(mobileBlock).toContain('showResources={false}')
    expect(mobileBlock).not.toContain('totalsOnly')
  })

  it('places mobile resource counters in a readable under-panel', () => {
    const imageBoardCss = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')
    expect(imageBoardCss).toContain('combat-area-cluster__seat-meta')
    const meta = imageBoardCss.match(
      /\.combat-area-cluster--row \.combat-area-cluster__seat-meta \.combat-area-cluster__resources-panel \{[\s\S]*?\}/
    )?.[0]
    expect(meta).toBeTruthy()
    expect(meta).toContain('max-height: none')
    expect(meta).not.toContain('position: absolute')
    expect(imageBoardCss).toContain('width: 0.95em')
    const rowBody = imageBoardCss.match(
      /\.combat-area-cluster--row \.combat-area-cluster__quadrant-body \{[\s\S]*?\}/
    )?.[0]
    expect(rowBody).toBeTruthy()
    expect(rowBody).not.toContain('translateY(-28%)')
    expect(rowBody).toContain('transform: none')
  })

  it('keeps desktop tech/deploy on the active seat chrome, not a mobile rim', () => {
    const seatCss = readFileSync(
      resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'),
      'utf8'
    )
    expect(cluster).not.toContain('BirdseyeIdleBand')
    expect(cluster).not.toContain('BirdseyeRimBar')
    expect(seatChrome).toContain('export function BirdseyeDesktopControls')
    expect(seatCss).toContain('.birdseye-seat__controls-stack')
  })

  it('keeps troop deploy as a two-column icon+count row', () => {
    const troopCss = readFileSync(
      resolve(root, 'components/CombatTroopControls/CombatTroopControls.css'),
      'utf8'
    )
    expect(troopCss).toContain('grid-template-columns: 1fr 1fr')
    expect(troopCss).not.toContain('flex-wrap: wrap')
    expect(troopCss).toContain('min-width: 0')
  })

  it('keeps 4-player row seats sharing width without horizontal spill', () => {
    const imageBoardCss = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')
    const rowSeat = imageBoardCss.match(
      /\.combat-area-cluster--row \.combat-area-cluster__seat \{[\s\S]*?\}/
    )?.[0]
    expect(rowSeat).toContain('flex: 1 1 0')
    expect(rowSeat).toContain('min-width: 0')
    expect(rowSeat).toContain('max-width: 25%')
    const row = imageBoardCss.match(/\.combat-area-cluster--row \{[\s\S]*?\}/)?.[0]
    expect(row).toContain('overflow-x: hidden')
    const seatCss = readFileSync(
      resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'),
      'utf8'
    )
    expect(seatCss).toContain('.birdseye-seat__deploy:has(.combat-deploy-dock[hidden])')
    expect(seatCss).not.toContain('translateY(100%)')
    expect(seatCss).not.toContain('translate3d(0, 100%')
  })

  it('overlays Reveal label on shared fanned-cards icon, matching Play label on agent', () => {
    expect(seatChrome).toContain('birdseye-seat-btn__label">Reveal')
    expect(seatChrome).toContain('birdseye-seat-btn__hand-count')
    expect(seatChrome).toContain('birdseye-seat-btn__agent')
    expect(seatChrome).not.toContain('birdseye-seat-btn__agent-count')
    expect(seatChrome).toContain('RevealCardsIcon')
    expect(seatChrome).toContain('birdseye-seat-btn__cards')
    expect(seatChrome).not.toContain('/icon/draw.png')
    const seatCss = readFileSync(
      resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'),
      'utf8'
    )
    expect(seatCss).toContain('.birdseye-seat-btn__cards')
    expect(seatCss).not.toContain('.birdseye-seat-btn--reveal::before')
    expect(seatCss).not.toContain('birdseye-seat-btn__agent-count')
    expect(seatCss).toMatch(
      /\.birdseye-seat-btn--play \.birdseye-seat-btn__label,\s*\n\s*\.birdseye-seat-btn--reveal \.birdseye-seat-btn__label \{[\s\S]*?position: absolute/
    )
    expect(seatCss).toMatch(
      /\.birdseye-seat__primary,\s*\n\s*\.birdseye-seat__utils \{[\s\S]*?grid-template-columns:\s*minmax\(2\.7rem, 1fr\) minmax\(2\.7rem, 1fr\)/
    )
  })

  it('renames Play to Change and swaps agent for a card thumbnail while selected-unplaced', () => {
    expect(seatChrome).toContain("isChangingSelectedCard ? 'Change' : 'Play'")
    expect(seatChrome).toContain('birdseye-seat-btn__card-thumb')
    expect(seatChrome).toContain('birdseye-seat-btn--has-card')
    expect(seatChrome).toContain('AgentIcon')
    expect(seatChrome).not.toContain('birdseye-seat-btn__agent-count')
    const app = readFileSync(resolve(root, 'App.tsx'), 'utf8')
    expect(app).toContain('isChangingSelectedCard')
    expect(app).toContain('selectedCardImage')
    expect(app).toMatch(
      /selectedCard && !agentPlaced && !player\.revealed && !isRevealTurn/
    )
    const seatCss = readFileSync(
      resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'),
      'utf8'
    )
    expect(seatCss).toContain('.birdseye-seat-btn__card-thumb')
    expect(seatCss).toContain('aspect-ratio: 5 / 7')
    expect(seatCss).toContain('object-fit: contain')
    expect(seatCss).toMatch(
      /\.birdseye-seat-btn--play \.birdseye-seat-btn__agent-icon\.agent \{[\s\S]*?inset:\s*0/
    )
    expect(seatCss).not.toContain('birdseye-seat-btn__agent-count')
  })

  it('keeps the play-control hang-left animation without a separate deploy slide', () => {
    const seatCss = readFileSync(
      resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.css'),
      'utf8'
    )
    expect(seatCss).toContain('birdseye-controls-out-left')
    expect(seatCss).not.toContain('birdseye-deploy-append-left')
    expect(seatCss).not.toContain('@keyframes birdseye-deploy-append-left')
  })

  it('uses icon+count deploy piles with no visible labels', () => {
    const troopControls = readFileSync(
      resolve(root, 'components/CombatTroopControls/CombatTroopControls.tsx'),
      'utf8'
    )
    expect(troopControls).toContain('/icon/deploy.png')
    expect(troopControls).toContain('troop-undeploy-button')
    expect(troopControls).toContain('troop-deploy-button')
    expect(troopControls).toContain('troop-action-count')
    expect(troopControls).not.toContain('>Deploy<')
    expect(troopControls).not.toContain('>Undo<')
    expect(troopControls).not.toContain('sent')
  })
})
