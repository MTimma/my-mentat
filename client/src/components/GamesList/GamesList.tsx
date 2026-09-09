import React, { useCallback, useEffect, useState } from 'react'
import {
  fetchGameDoc,
  fetchGames,
  getCachedGamesList,
  invalidateGamesListCache,
  type GameDetail,
  type LoadSaveFn,
} from '../../api/gamesApi'
import {
  deleteLocalGame,
  getLocalGame,
  listLocalGames,
  MAX_LOCAL_GAMES,
  type LocalGameMeta,
} from '../../save/localGamesStore'
import './GamesList.css'

type GamesListTab = 'local' | 'community' | 'official'

export interface GamesListProps {
  onLoad: LoadSaveFn
  className?: string
}

function formatUnixOrIso(raw: string): string {
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && raw.trim() !== '') {
    return new Date(seconds * 1000).toLocaleString()
  }
  const parsed = Date.parse(raw)
  if (Number.isFinite(parsed)) return new Date(parsed).toLocaleString()
  return raw
}

function formatMs(ms: number): string {
  return new Date(ms).toLocaleString()
}

const GamesList: React.FC<GamesListProps> = ({ onLoad, className }) => {
  const [activeTab, setActiveTab] = useState<GamesListTab>('community')
  const cachedCommunity = getCachedGamesList()
  const [games, setGames] = useState<GameDetail[]>(cachedCommunity ?? [])
  const [localGames, setLocalGames] = useState<LocalGameMeta[]>([])
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
      const rows = await listLocalGames()
      setLocalGames(rows)
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
          <p className="games-list-empty">No official games yet.</p>
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
              <div className="games-list-table-wrap">
                <table className="games-list-table">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Updated</th>
                      <th scope="col" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {localGames.map(game => (
                      <tr key={game.id}>
                        <td className="games-list-name">{game.title}</td>
                        <td className="games-list-meta">{formatMs(game.updatedAt)}</td>
                        <td>
                          <div className="games-list-actions">
                            <button
                              type="button"
                              className="games-list-load-btn"
                              disabled={loadingId === `local:${game.id}`}
                              onClick={() => void handleLoadLocal(game)}
                            >
                              {loadingId === `local:${game.id}` ? 'Loading…' : 'Load'}
                            </button>
                            <button
                              type="button"
                              className="games-list-delete-btn"
                              disabled={deletingId === game.id}
                              onClick={() => void handleDeleteLocal(game)}
                            >
                              {deletingId === game.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          <div className="games-list-table-wrap">
            <table className="games-list-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Updated</th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {games.map(game => (
                  <tr key={game.id}>
                    <td className="games-list-name">{game.name || `Game #${game.id}`}</td>
                    <td className="games-list-meta">{formatUnixOrIso(game.updated_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="games-list-load-btn"
                        disabled={loadingId === `server:${game.id}`}
                        onClick={() => void handleLoadCommunity(game)}
                      >
                        {loadingId === `server:${game.id}` ? 'Loading…' : 'Load'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
