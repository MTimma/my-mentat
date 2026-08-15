import React, { useMemo, useState, type RefObject } from 'react'
import {
  Player,
  type ConflictCard,
  type Gain,
  type GameState,
  type IntrigueCard,
  GainSource,
  IntrigueCardType,
} from '../../types/GameTypes'
import { conflictCardImageSrc } from '../../data/conflictCardImages'
import { getLeaderIconPath } from '../../data/leaders'
import { ALL_INTRIGUE_CARDS } from '../../services/IntrigueDeckService'
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal'
import { resolveCardInSnapshot, resolveCardInSnapshotByName } from '../../utils/revealTurnStats'
import { buildCombatRankEntries } from '../../utils/combatRankStrip'
import { CombatRankChip } from '../ImageBoard/CombatRankStrip'
import TurnGainsDisplay from '../TurnGainsDisplay/TurnGainsDisplay'
import '../TurnHistory.css'
import './CombatPhaseOverlay.css'

export interface CombatPhaseOverlayProps {
  players: Player[]
  combatStrength: Record<number, number>
  combatPasses: Set<number>
  activePlayerId: number
  isVisible: boolean
  /** Active player has played at least one combat intrigue this visit (footer shows Continue). */
  activePlayerPlayedCombatIntrigue?: boolean
  /** History replay or live COMBAT_REWARDS: show resolved combat summary without live-turn prompts. */
  readOnly?: boolean
  /** When set, overlay is scoped to this board container instead of the full viewport. */
  containerRef?: RefObject<HTMLElement | null>
  /** Round conflict card shown on the left of the resolution / phase modal. */
  currentConflict?: ConflictCard | null
  /**
   * Combat resolution snapshot (`historyEntryKind === 'combat'`), or the live
   * in-progress view built by `buildCombatResolutionView`.
   * Supplies placement rewards (`GainSource.CONFLICT`) and intrigue plays
   * (`GainSource.INTRIGUE` + `currTurn.playedIntrigueCard`).
   */
  resolutionState?: GameState | null
  /** Live COMBAT_REWARDS: confirm applies rewards and continues. */
  onConfirm?: () => void
}

function CombatLeaderPortrait({ player }: { player: Player }) {
  const iconPath = getLeaderIconPath(player.leader.name)

  return (
    <span
      className={`turn-history-player-badge leader-avatar-btn ${player.color}`}
      title={player.leader.name}
      aria-hidden="true"
    >
      {iconPath ? (
        <img src={iconPath} alt="" className="turn-history-player-icon" draggable={false} />
      ) : (
        <span className="turn-history-player-icon-fallback">{player.leader.name.charAt(0)}</span>
      )}
    </span>
  )
}

function CombatConflictCard({ conflict }: { conflict: ConflictCard }) {
  const src = conflict.id > 0 ? conflictCardImageSrc(conflict.id) : null
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src && !failed)

  return (
    <div className="combat-phase-conflict" title={conflict.name}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={conflict.name}
          className="combat-phase-conflict-img"
          draggable={false}
          data-preview-src={src ?? undefined}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="combat-phase-conflict-fallback">
          <span className="combat-phase-conflict-tier">T{conflict.tier}</span>
          <span className="combat-phase-conflict-name">{conflict.name}</span>
        </div>
      )}
    </div>
  )
}

function intrigueCardForGain(gain: Gain, state?: GameState | null): IntrigueCard | undefined {
  const fromDiscard = state?.intrigueDiscard?.find(card => card.id === gain.sourceId)
  if (fromDiscard) return fromDiscard
  const fromDeck = state?.intrigueDeck?.find(card => card.id === gain.sourceId)
  if (fromDeck) return fromDeck
  return ALL_INTRIGUE_CARDS(state?.expansions).find(card => card.id === gain.sourceId)
}

function intrigueCardById(cardId: number, state?: GameState | null): IntrigueCard | undefined {
  const fromDiscard = state?.intrigueDiscard?.find(card => card.id === cardId)
  if (fromDiscard) return fromDiscard
  const fromDeck = state?.intrigueDeck?.find(card => card.id === cardId)
  if (fromDeck) return fromDeck
  return ALL_INTRIGUE_CARDS(state?.expansions).find(card => card.id === cardId)
}

/** Combat-snapshot intrigue plays; drop plot/endgame when the card type is known. */
function isCombatIntrigueGain(gain: Gain, state?: GameState | null): boolean {
  if (gain.source !== GainSource.INTRIGUE) return false
  const card = intrigueCardForGain(gain, state)
  if (!card) return true
  return card.type === IntrigueCardType.COMBAT
}

type CombatIntrigueRow = {
  cardId: number
  name: string
  effectGains: Gain[]
}

function combatIntriguesForPlayer(playerId: number, state?: GameState | null): CombatIntrigueRow[] {
  if (!state) return []
  const byCard = new Map<number, CombatIntrigueRow>()

  const addPlay = (cardId: number, name: string, gain?: Gain) => {
    const existing = byCard.get(cardId)
    const effectGains = gain && gain.amount !== 0 ? [gain] : []
    if (existing) {
      existing.effectGains.push(...effectGains)
      if (name) existing.name = name
      return
    }
    const card = intrigueCardById(cardId, state)
    if (card && card.type !== IntrigueCardType.COMBAT) return
    byCard.set(cardId, {
      cardId,
      name: card?.name ?? name,
      effectGains,
    })
  }

  for (const gain of state.gains ?? []) {
    if (gain.playerId !== playerId || !isCombatIntrigueGain(gain, state)) continue
    addPlay(gain.sourceId, gain.name, gain)
  }

  const playedIds = state.currTurn?.playedIntrigueCard?.map(play => play.cardId) ?? []
  for (const cardId of playedIds) {
    if (byCard.has(cardId)) continue
    const attributed = (state.gains ?? []).some(
      gain =>
        gain.source === GainSource.INTRIGUE &&
        gain.sourceId === cardId &&
        gain.playerId === playerId
    )
    if (!attributed) continue
    const card = intrigueCardById(cardId, state)
    addPlay(cardId, card?.name ?? '')
  }

  return [...byCard.values()].filter(row => row.name)
}

function resolveGainCard(state: GameState, playerId: number, cardId: number, name: string) {
  return (
    resolveCardInSnapshot(state, playerId, cardId) ??
    (name ? resolveCardInSnapshotByName(state, playerId, name) : undefined)
  )
}

const CombatPhaseOverlay: React.FC<CombatPhaseOverlayProps> = ({
  players,
  combatStrength,
  combatPasses,
  activePlayerId,
  isVisible,
  activePlayerPlayedCombatIntrigue = false,
  readOnly = false,
  containerRef,
  currentConflict = null,
  resolutionState = null,
  onConfirm,
}) => {
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(isVisible, {
    containerRef,
  })

  const rankEntries = useMemo(() => {
    const troops = resolutionState?.combatTroops ?? {}
    const riseOfIx = Boolean(resolutionState?.expansions?.riseOfIx)
    return [...buildCombatRankEntries({
      players,
      troops,
      strength: combatStrength,
      riseOfIx,
    })].sort((a, b) => a.place - b.place || b.strength - a.strength)
  }, [players, combatStrength, resolutionState])

  const riseOfIx = Boolean(resolutionState?.expansions?.riseOfIx)
  const resolutionGains = resolutionState?.gains ?? []

  const hasParticipants = rankEntries.length > 0
  const showConflictCard = Boolean(currentConflict && currentConflict.id > 0)

  const activePlayer = players.find(player => player.id === activePlayerId)

  if (!isVisible || waitForBoardTarget) return null

  return portalNode(
    <div
      className={[
        'combat-phase-overlay',
        'modal-overlay',
        scopedClass || (containerRef ? 'combat-phase-overlay--board-scoped' : ''),
      ]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Combat phase"
    >
      <div
        className={[
          'combat-phase-modal',
          showConflictCard ? 'combat-phase-modal--with-conflict' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="combat-phase-modal-heading">
          <span className="turn-history-action-kind turn-history-action-kind--combat">Combat</span>
        </div>
        {!readOnly && activePlayer && (
          <p className="combat-phase-active-player">
            <CombatLeaderPortrait player={activePlayer} />
            <span>
              {activePlayer.leader.name}
              <span className="combat-phase-active-label">
                {activePlayerPlayedCombatIntrigue
                  ? ' — play another intrigue or continue'
                  : ' — play intrigue or pass'}
              </span>
            </span>
          </p>
        )}
        <div className="combat-phase-body">
          {showConflictCard && currentConflict ? <CombatConflictCard conflict={currentConflict} /> : null}
          <div className="combat-phase-rankings" aria-label="Combat strength rankings">
            {!hasParticipants ? (
              <p className="combat-phase-empty">No participants in the conflict</p>
            ) : null}
            {rankEntries.map(entry => {
              const playerId = entry.player.id
              const hasPassed = combatPasses.has(playerId)
              const isActive = !readOnly && playerId === activePlayerId
              const playerGains = resolutionGains.filter(gain => gain.playerId === playerId)
              const conflictRewards = playerGains.filter(
                gain => gain.source === GainSource.CONFLICT && gain.amount !== 0
              )
              const intrigueRows = combatIntriguesForPlayer(playerId, resolutionState)
              const showDetails = conflictRewards.length > 0 || intrigueRows.length > 0
              return (
                <div
                  key={playerId}
                  className={[
                    'combat-phase-rank',
                    `combat-phase-rank--place-${entry.place}`,
                    !readOnly && hasPassed ? 'combat-phase-rank--passed' : '',
                    isActive ? 'combat-phase-rank--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="combat-phase-rank-place">{entry.place}</span>
                  <CombatRankChip
                    entry={entry}
                    riseOfIx={riseOfIx}
                    isActive={isActive}
                  />
                  {showDetails ? (
                    <div className="combat-phase-rank-details">
                      {conflictRewards.length > 0 ? (
                        <TurnGainsDisplay
                          gains={conflictRewards}
                          playerId={playerId}
                          showSourceTitles={false}
                          inlineTrash
                          resolveCard={
                            resolutionState
                              ? (cardId, name) =>
                                  resolveGainCard(resolutionState, playerId, cardId, name)
                              : undefined
                          }
                          className="combat-phase-rank-rewards"
                        />
                      ) : null}
                      {intrigueRows.length > 0 ? (
                        <div className="combat-phase-rank-intrigues">
                          {intrigueRows.map(row =>
                            row.effectGains.length > 0 ? (
                              <TurnGainsDisplay
                                key={row.cardId}
                                gains={row.effectGains}
                                playerId={playerId}
                                showSourceTitles
                                inlineTrash
                                resolveCard={
                                  resolutionState
                                    ? (cardId, name) =>
                                        resolveGainCard(resolutionState, playerId, cardId, name)
                                    : undefined
                                }
                              />
                            ) : (
                              <span key={row.cardId} className="combat-phase-intrigue-name">
                                {row.name}
                              </span>
                            )
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {!readOnly && hasPassed ? (
                    <span className="combat-phase-passed">Passed</span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
        {!readOnly ? (
          <p className="combat-phase-hint">
            Play any number of combat intrigue cards, then pass. Playing a card lets everyone act again.
          </p>
        ) : null}
        {readOnly && onConfirm ? (
          <button type="button" className="combat-phase-confirm" onClick={onConfirm}>
            Confirm
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default CombatPhaseOverlay
