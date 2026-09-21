import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { TurnType, type GameState, type Player } from '../../types/GameTypes'
import { useGame } from '../GameContext/GameContext'
import { useTimeTravel } from '../TimeTravel'
import TurnHistoryNav from '../TurnHistoryNav/TurnHistoryNav'
import { TurnHistoryUndoButton, useTurnHistoryUndo } from '../TurnHistoryUndoButton'
import { TurnHistoryDebugButton } from '../TurnHistoryDebugButton'
import {
  birdseyeRoundGroupContainsIndex,
  buildBirdseyeTurnHistoryGrid,
  getBirdseyeHistoryCellParts,
  groupBirdseyeHistoryRounds,
  type BirdseyeHistoryCell,
} from '../../utils/turnHistoryDisplay'
import { BirdseyeLaneScrollbar, useScrollOverflowFades } from './CombatSeatTurnChrome'

function turnAtIndex(
  history: GameState[],
  liveState: GameState,
  historyIndex: number,
  isLive: boolean
): GameState | undefined {
  if (isLive) return liveState
  return history[historyIndex]
}

function cellAriaLabel(parts: { played?: string; action: string }, player: Player | undefined): string {
  const who = player?.leader.name ?? 'Player'
  if (parts.played) return `${who}: ${parts.played} to ${parts.action}`
  return `${who}: ${parts.action}`
}

export function BirdseyeTurnHistoryGrid({
  playerIds,
  players,
}: {
  playerIds: number[]
  players: Player[]
}) {
  const { gameState } = useGame()
  const { viewingTurnIndex, isViewingHistory, goToTurn, returnToCurrent, hideLiveTurn } = useTimeTravel()
  const undo = useTurnHistoryUndo()
  const activeCellRef = useRef<HTMLButtonElement | null>(null)
  const playerById = useMemo(() => new Map(players.map(player => [player.id, player])), [players])

  const history = gameState.history
  const rows = useMemo(
    () => buildBirdseyeTurnHistoryGrid(history, playerIds, hideLiveTurn ? undefined : gameState),
    [history, playerIds, gameState, hideLiveTurn]
  )
  const roundGroups = useMemo(() => groupBirdseyeHistoryRounds(rows), [rows])
  const activeRoundRef = useRef<HTMLDivElement | null>(null)
  const { scrollRef, scrollable, thumb } = useScrollOverflowFades(
    roundGroups.length > 0,
    `${roundGroups.length}:${roundGroups.reduce((n, group) => n + group.rows.length, 0)}`
  )

  const viewingKey = isViewingHistory ? `h-${viewingTurnIndex}` : 'live'
  const viewingHistoryIndex = isViewingHistory ? viewingTurnIndex : history.length
  const activeRoundKey =
    roundGroups.find(group =>
      birdseyeRoundGroupContainsIndex(group, viewingHistoryIndex ?? history.length, !isViewingHistory)
    )?.key ?? roundGroups[roundGroups.length - 1]?.key

  useLayoutEffect(() => {
    const roundEl = activeRoundRef.current
    const scrollEl = scrollRef.current
    if (!roundEl || !scrollEl) return
    const delta =
      roundEl.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top
    if (delta !== 0) scrollEl.scrollTop += delta
  }, [viewingKey, activeRoundKey, roundGroups.length])

  const handleCellClick = (cell: BirdseyeHistoryCell) => {
    if (gameState.sandboxSetup) return
    if (cell.isLive) {
      if (hideLiveTurn) return
      returnToCurrent()
      return
    }
    goToTurn(cell.historyIndex)
  }

  const handleBannerClick = (historyIndex: number, isLive: boolean) => {
    if (gameState.sandboxSetup) return
    if (isLive || historyIndex >= history.length) {
      if (hideLiveTurn) return
      returnToCurrent()
      return
    }
    if (isViewingHistory && viewingTurnIndex === historyIndex) {
      if (!hideLiveTurn) returnToCurrent()
      return
    }
    goToTurn(historyIndex)
  }

  const inSandboxSetup = Boolean(gameState.sandboxSetup)
  const effectiveViewIndex = viewingTurnIndex ?? history.length
  const lastVisibleIndex = hideLiveTurn ? Math.max(-1, history.length - 1) : history.length
  const canGoToPreviousTurn = !inSandboxSetup && effectiveViewIndex > 0
  const canGoToNextTurn =
    !inSandboxSetup && viewingTurnIndex !== null && effectiveViewIndex < lastVisibleIndex

  const goToPreviousTurn = useCallback(() => {
    if (!canGoToPreviousTurn) return
    goToTurn(Math.max(0, effectiveViewIndex - 1))
  }, [canGoToPreviousTurn, effectiveViewIndex, goToTurn])

  const goToNextTurn = useCallback(() => {
    if (!canGoToNextTurn) return
    if (effectiveViewIndex < lastVisibleIndex) {
      goToTurn(effectiveViewIndex + 1)
    } else {
      returnToCurrent()
    }
  }, [canGoToNextTurn, effectiveViewIndex, lastVisibleIndex, goToTurn, returnToCurrent])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPreviousTurn()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        goToNextTurn()
        return
      }
      if (e.key === 'Escape' && isViewingHistory) {
        returnToCurrent()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPreviousTurn, goToNextTurn, isViewingHistory, returnToCurrent])

  return (
    <div
      className={['birdseye-turn-history', scrollable ? 'birdseye-turn-history--scrollable' : '']
        .filter(Boolean)
        .join(' ')}
      role="grid"
      aria-label="Turn history"
      aria-colcount={playerIds.length}
      style={{ ['--birdseye-history-cols' as string]: String(playerIds.length) }}
    >
      <div className="birdseye-turn-history__header">
        <TurnHistoryNav
          className="birdseye-turn-history__nav"
          viewingTurnIndex={viewingTurnIndex}
          historyLength={history.length}
          inSandboxSetup={Boolean(gameState.sandboxSetup)}
          isViewingHistory={isViewingHistory}
          onTurnChange={goToTurn}
          onReturnToCurrent={returnToCurrent}
          hideLiveTurn={hideLiveTurn}
        />
        <div className="birdseye-turn-history__header-actions">
          {undo ? (
            <TurnHistoryUndoButton
              className="birdseye-turn-history__undo"
              onUndo={undo.onUndo}
              canUndo={undo.canUndo}
              undoTitle={undo.undoTitle}
              undoAriaLabel={undo.undoAriaLabel}
            />
          ) : null}
          <TurnHistoryDebugButton
            className="birdseye-turn-history__debug"
            onLoadSave={undo?.onLoadSave}
          />
        </div>
      </div>
      <div className="birdseye-turn-history__scroll-host">
        <div className="birdseye-turn-history__scroll birdseye-lane-scroll" ref={scrollRef}>
        {roundGroups.map(group => {
          const isActiveRound = group.key === activeRoundKey
          return (
            <div
              key={group.key}
              className={[
                'birdseye-turn-history__round',
                isActiveRound ? 'birdseye-turn-history__round--current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              ref={isActiveRound ? activeRoundRef : undefined}
            >
              {group.rows.map((row, rowIndex) => {
                if (row.type === 'banner') {
                  const { banner } = row
                  const isViewing =
                    banner.isLive
                      ? !isViewingHistory
                      : viewingTurnIndex === banner.historyIndex
                  return (
                    <button
                      key={`banner-${banner.historyIndex}-${banner.kind}-${rowIndex}`}
                      type="button"
                      className={[
                        'birdseye-turn-history__banner',
                        `birdseye-turn-history__banner--${banner.kind}`,
                        isViewing ? 'birdseye-turn-history__banner--viewing' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleBannerClick(banner.historyIndex, banner.isLive)}
                      ref={isViewing ? activeCellRef : undefined}
                    >
                      {banner.label}
                    </button>
                  )
                }

                return (
                  <div
                    key={`turns-${group.key}-${rowIndex}`}
                    className="birdseye-turn-history__row"
                    role="row"
                  >
                    {row.cells.map((cell, colIndex) => {
                      if (!cell) {
                        const emptyPlayer = playerById.get(playerIds[colIndex])
                        return (
                          <div
                            key={`empty-${group.key}-${rowIndex}-${colIndex}`}
                            className={[
                              'birdseye-turn-history__cell',
                              'birdseye-turn-history__cell--empty',
                              emptyPlayer ? `birdseye-turn-history__cell--${emptyPlayer.color}` : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            role="gridcell"
                          />
                        )
                      }
                      const turn = turnAtIndex(history, gameState, cell.historyIndex, cell.isLive)
                      const parts = turn
                        ? getBirdseyeHistoryCellParts(turn)
                        : { action: cell.isLive ? 'Current' : '—' }
                      const player = playerById.get(cell.playerId)
                      const isViewing = cell.isLive
                        ? !isViewingHistory
                        : viewingTurnIndex === cell.historyIndex
                      const isReveal = turn?.currTurn?.type === TurnType.REVEAL
                      return (
                        <div
                          key={`cell-${cell.historyIndex}`}
                          className="birdseye-turn-history__cell-wrap"
                          role="gridcell"
                        >
                          <button
                            type="button"
                            className={[
                              'birdseye-turn-history__cell',
                              player ? `birdseye-turn-history__cell--${player.color}` : '',
                              isViewing ? 'birdseye-turn-history__cell--viewing' : '',
                              cell.isLive ? 'birdseye-turn-history__cell--live' : '',
                              isReveal ? 'birdseye-turn-history__cell--reveal' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => handleCellClick(cell)}
                            aria-current={isViewing ? 'step' : undefined}
                            aria-label={cellAriaLabel(parts, player)}
                            title={cellAriaLabel(parts, player)}
                            ref={isViewing ? activeCellRef : undefined}
                          >
                            {parts.played ? (
                              <span className="birdseye-turn-history__played">{parts.played}</span>
                            ) : null}
                            <span className="birdseye-turn-history__action">{parts.action}</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
        <BirdseyeLaneScrollbar visible={scrollable} thumb={thumb} />
      </div>
    </div>
  )
}

export default BirdseyeTurnHistoryGrid
