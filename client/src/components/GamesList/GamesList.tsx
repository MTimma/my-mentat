import React, { useCallback, useEffect, useState } from 'react'
import { fetchGameDoc, fetchGames, type GameDetail, type LoadSaveFn } from '../../api/gamesApi'
import './GamesList.css'

type GamesListTab = 'community' | 'official'

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

const GamesList: React.FC<GamesListProps> = ({ onLoad, className }) => {
  const [activeTab, setActiveTab] = useState<GamesListTab>('community')
  const [games, setGames] = useState<GameDetail[]>([])
  const [listStatus, setListStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('loading')
  const [listError, setListError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const loadGames = useCallback(async () => {
    setListStatus('loading')
    setListError(null)
    try {
      const rows = await fetchGames()
      setGames(rows)
      setListStatus('ready')
    } catch (error) {
      setGames([])
      setListStatus('error')
      setListError(error instanceof Error ? error.message : 'Failed to load games')
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'community') return
    void loadGames()
  }, [activeTab, loadGames])

  const handleLoadGame = async (game: GameDetail) => {
    setLoadError(null)
    setLoadingId(game.id)
    try {
      const doc = await fetchGameDoc(game.id)
      onLoad(doc, game.id)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : `Failed to load game #${game.id}`)
    } finally {
      setLoadingId(null)
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
      </div>

      <div className="games-list-panel" role="tabpanel">
        {activeTab === 'official' ? (
          <p className="games-list-empty">No official games yet.</p>
        ) : listStatus === 'loading' ? (
          <p className="games-list-status">Loading community games…</p>
        ) : listStatus === 'error' ? (
          <div>
            <p className="games-list-error" role="alert">
              {listError}
            </p>
            <button type="button" className="games-list-retry" onClick={() => void loadGames()}>
              Retry
            </button>
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
                        disabled={loadingId === game.id}
                        onClick={() => void handleLoadGame(game)}
                      >
                        {loadingId === game.id ? 'Loading…' : 'Load'}
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
