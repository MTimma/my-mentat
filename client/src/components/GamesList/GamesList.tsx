import React, { useCallback, useEffect, useState } from 'react'
import {
  fetchGameDoc,
  fetchGames,
  getCachedGamesList,
  invalidateGamesListCache,
  type GameDetail,
  type LoadSaveFn,
} from '../../api/gamesApi'
import { getLeaderIconPath, LEADER_ICON_SLUGS } from '../../data/leaders'
import { inferGamePackId } from '../../gamePacks/inferGamePack'
import { getSelectableGamePacks } from '../../gamePacks/registry'
import { replaySaveDoc } from '../../save/replay'
import type { SaveDoc, SaveSummary, SaveSummaryPlayer } from '../../save/types'
import { compareEndgameStanding } from '../../utils/endgameResolution'
import { getTotalVictoryPoints } from '../../utils/influenceVictoryPoints'
import {
  deleteLocalGame,
  getLocalGame,
  listLocalGameRecords,
  MAX_LOCAL_GAMES,
  type LocalGameMeta,
} from '../../save/localGamesStore'
import './GamesList.css'

type GamesListTab = 'local' | 'community' | 'official'

export interface GamesListProps {
  onLoad: LoadSaveFn
  className?: string
}

function gameKitLabel(gamePackId: string): string {
  return getSelectableGamePacks().find(pack => pack.ref === gamePackId)?.label ?? gamePackId
}

function leaderName(leaderId: string): string {
  return Object.entries(LEADER_ICON_SLUGS).find(([, slug]) => slug === leaderId)?.[0] ?? leaderId
}

function summaryForDraft(doc: SaveDoc): SaveSummary | undefined {
  const setup = doc.setup
  if (!setup?.players?.length) return undefined
  const turns = (doc.events ?? []).filter(entry => entry.a?.type === 'END_TURN').length
  try {
    const { state } = replaySaveDoc(doc)
    const players = [...setup.players]
      .sort((a, b) => {
        const playerA = state.players.find(p => p.id === a.id)
        const playerB = state.players.find(p => p.id === b.id)
        if (!playerA || !playerB) return 0
        return compareEndgameStanding(state, playerA, playerB)
      })
      .map(setupPlayer => {
        const player = state.players.find(p => p.id === setupPlayer.id)
        const leaderId = player
          ? (LEADER_ICON_SLUGS[player.leader.name] ?? setupPlayer.leaderId)
          : setupPlayer.leaderId
        return {
          id: setupPlayer.id,
          name: player?.leader.name ?? leaderName(leaderId),
          leaderId,
          color: player?.color ?? setupPlayer.color,
          vp: player ? getTotalVictoryPoints(player, state) : 0,
        }
      })
    return {
      gamePackId: inferGamePackId(setup),
      rounds: state.currentRound,
      turns,
      players,
    }
  } catch {
    return {
      gamePackId: inferGamePackId(setup),
      rounds: setup.currentRound ?? 1,
      turns,
      players: setup.players.map(player => ({
        id: player.id,
        name: leaderName(player.leaderId),
        leaderId: player.leaderId,
        color: player.color,
        vp: player.startingResources?.victoryPoints ?? 0,
      })),
    }
  }
}

function leaderIconSrc(leaderId: string): string | undefined {
  const leaderName = Object.entries(LEADER_ICON_SLUGS).find(([, slug]) => slug === leaderId)?.[0]
  return leaderName ? getLeaderIconPath(leaderName) : undefined
}

function GameNameBlock({ name, summary }: { name: string; summary?: SaveSummary }) {
  return (
    <div className="games-list-name-block">
      <div className="games-list-name">{name}</div>
      {summary ? (
        <>
          <div className="games-list-summary__kit">{gameKitLabel(summary.gamePackId)}</div>
          <div className="games-list-summary__counts">
            <span>Rounds: {summary.rounds}</span>
            <span>Turns: {summary.turns}</span>
          </div>
        </>
      ) : null}
    </div>
  )
}

function PlayerList({ summary }: { summary?: SaveSummary }) {
  if (!summary?.players.length) return <>—</>
  return (
    <ul className="games-list-summary__players">
      {summary.players.map(player => (
        <SummaryPlayer key={player.id} player={player} />
      ))}
    </ul>
  )
}

function SummaryPlayer({ player }: { player: SaveSummaryPlayer }) {
  const iconSrc = leaderIconSrc(player.leaderId)
  return (
    <li className="games-list-player" aria-label={`${player.name}, ${player.vp} victory points`}>
      {iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          className={`games-list-player__icon games-list-player__icon--${player.color}`}
          draggable={false}
        />
      ) : (
        <span
          className={`games-list-player__icon games-list-player__icon--fallback games-list-player__icon--${player.color}`}
          aria-hidden="true"
        />
      )}
      <span className="games-list-player__vp">
        <img src="/icon/vp.png" alt="" className="games-list-player__vp-icon" draggable={false} />
        {player.vp}
      </span>
    </li>
  )
}

interface BrowseGameRow {
  key: string
  name: string
  summary?: SaveSummary
  loading: boolean
  onLoad: () => void
  deleting?: boolean
  onDelete?: () => void
}

function BrowseGameTable({ rows, emptyLabel }: { rows: BrowseGameRow[]; emptyLabel?: string }) {
  if (rows.length === 0) {
    return <p className="games-list-empty">{emptyLabel ?? 'No games yet.'}</p>
  }
  return (
    <div className="games-list-table-wrap">
      <table className="games-list-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Players</th>
            <th scope="col" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <td>
                <GameNameBlock name={row.name} summary={row.summary} />
              </td>
              <td>
                <PlayerList summary={row.summary} />
              </td>
              <td>
                <div className="games-list-actions">
                  <button
                    type="button"
                    className="games-list-load-btn"
                    disabled={row.loading}
                    onClick={row.onLoad}
                  >
                    {row.loading ? 'Loading…' : 'Load'}
                  </button>
                  {row.onDelete ? (
                    <button
                      type="button"
                      className="games-list-delete-btn"
                      disabled={row.deleting}
                      onClick={row.onDelete}
                    >
                      {row.deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const GamesList: React.FC<GamesListProps> = ({ onLoad, className }) => {
  const [activeTab, setActiveTab] = useState<GamesListTab>('community')
  const cachedCommunity = getCachedGamesList()
  const [games, setGames] = useState<GameDetail[]>(cachedCommunity ?? [])
  const [localGames, setLocalGames] = useState<Array<LocalGameMeta & { summary?: SaveSummary }>>([])
  const [listStatus, setListStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    () => (cachedCommunity ? 'ready' : 'loading')
  )
  const [listError, setListError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedError, setCopiedError] = useState(false)

  const copyListError = useCallback(async () => {
    if (!listError) return
    try {
      await navigator.clipboard.writeText(listError)
      setCopiedError(true)
      window.setTimeout(() => setCopiedError(false), 1500)
    } catch {
      /* selection still works */
    }
  }, [listError])

  const loadCommunityGames = useCallback(async (fresh = false) => {
    if (fresh) invalidateGamesListCache()
    setListStatus('loading')
    setListError(null)
    try {
      const rows = await fetchGames({ fresh })
      setGames(rows)
      setListStatus('ready')
    } catch (error) {
      setGames([])
      setListStatus('error')
      setListError(error instanceof Error ? error.message : 'Failed to load games')
    }
  }, [])

  const loadLocalGames = useCallback(async () => {
    setListStatus('loading')
    setListError(null)
    try {
      const records = await listLocalGameRecords()
      setLocalGames(
        records.map(record => ({
          id: record.id,
          title: record.title,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          summary: summaryForDraft(record.doc),
        }))
      )
      setListStatus('ready')
    } catch (error) {
      setLocalGames([])
      setListStatus('error')
      setListError(error instanceof Error ? error.message : 'Failed to load drafts')
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'community') {
      void loadCommunityGames()
      return
    }
    if (activeTab === 'local') {
      void loadLocalGames()
      return
    }
    setListStatus('ready')
  }, [activeTab, loadCommunityGames, loadLocalGames])

  const handleLoadCommunity = async (game: GameDetail) => {
    setLoadError(null)
    setLoadingId(`server:${game.id}`)
    try {
      const { doc, canEdit, id } = await fetchGameDoc(game.id)
      onLoad(doc, { serverGameId: id, canEdit })
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : `Failed to load game #${game.id}`)
    } finally {
      setLoadingId(null)
    }
  }

  const handleLoadLocal = async (game: LocalGameMeta) => {
    setLoadError(null)
    setLoadingId(`local:${game.id}`)
    try {
      const record = await getLocalGame(game.id)
      if (!record) {
        setLoadError('Draft no longer exists in this browser.')
        void loadLocalGames()
        return
      }
      onLoad(record.doc, { localGameId: record.id })
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : `Failed to load draft`)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDeleteLocal = async (game: LocalGameMeta) => {
    if (!window.confirm(`Delete draft "${game.title}" from this browser?`)) return
    setDeletingId(game.id)
    setLoadError(null)
    try {
      await deleteLocalGame(game.id)
      await loadLocalGames()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to delete draft')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={['games-list', className].filter(Boolean).join(' ')}>
      <div className="games-list-tabs" role="tablist" aria-label="Saved games">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'community'}
          className={[
            'games-list-tab',
            activeTab === 'community' ? 'games-list-tab--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setActiveTab('community')}
        >
          Community
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'official'}
          className={[
            'games-list-tab',
            activeTab === 'official' ? 'games-list-tab--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setActiveTab('official')}
        >
          Official
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'local'}
          className={[
            'games-list-tab',
            activeTab === 'local' ? 'games-list-tab--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setActiveTab('local')}
        >
          Draft
        </button>
      </div>

      <div className="games-list-panel" role="tabpanel">
        {activeTab === 'official' ? (
          <BrowseGameTable rows={[]} emptyLabel="No official games yet." />
        ) : activeTab === 'local' ? (
          listStatus === 'loading' ? (
            <p className="games-list-status">Loading drafts…</p>
          ) : listStatus === 'error' ? (
            <div className="games-list-error-block">
              <pre className="games-list-error games-list-error--copyable" role="alert" tabIndex={0}>
                {listError}
              </pre>
              <div className="games-list-error-actions">
                <button type="button" className="games-list-retry" onClick={() => void copyListError()}>
                  {copiedError ? 'Copied' : 'Copy error'}
                </button>
                <button type="button" className="games-list-retry" onClick={() => void loadLocalGames()}>
                  Retry
                </button>
              </div>
            </div>
          ) : localGames.length === 0 ? (
            <p className="games-list-empty">No drafts in this browser yet.</p>
          ) : (
            <>
              <p className="games-list-cap-note">
                {localGames.length}/{MAX_LOCAL_GAMES} drafts (stored on this device)
              </p>
              <BrowseGameTable
                rows={localGames.map(game => ({
                  key: game.id,
                  name: game.title,
                  summary: game.summary,
                  loading: loadingId === `local:${game.id}`,
                  onLoad: () => void handleLoadLocal(game),
                  deleting: deletingId === game.id,
                  onDelete: () => void handleDeleteLocal(game),
                }))}
              />
            </>
          )
        ) : listStatus === 'loading' ? (
          <p className="games-list-status">Loading community games…</p>
        ) : listStatus === 'error' ? (
          <div className="games-list-error-block">
            <pre className="games-list-error games-list-error--copyable" role="alert" tabIndex={0}>
              {listError}
            </pre>
            <div className="games-list-error-actions">
              <button type="button" className="games-list-retry" onClick={() => void copyListError()}>
                {copiedError ? 'Copied' : 'Copy error'}
              </button>
              <button type="button" className="games-list-retry" onClick={() => void loadCommunityGames(true)}>
                Retry
              </button>
            </div>
          </div>
        ) : games.length === 0 ? (
          <p className="games-list-empty">No community games yet.</p>
        ) : (
          <BrowseGameTable
            rows={games.map(game => ({
              key: String(game.id),
              name: game.name || `Game #${game.id}`,
              summary: game.summary,
              loading: loadingId === `server:${game.id}`,
              onLoad: () => void handleLoadCommunity(game),
            }))}
          />
        )}
      </div>

      {loadError && (
        <p className="games-list-load-error" role="alert">
          {loadError}
        </p>
      )}
    </div>
  )
}

export default GamesList
