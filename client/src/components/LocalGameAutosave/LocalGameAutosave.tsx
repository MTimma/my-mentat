import { useEffect, useRef } from 'react'
import { saveGameJson } from '../../api/gamesApi'
import { useGame } from '../GameContext/gameContextState'

const AUTOSAVE_MS = 500

interface LocalGameAutosaveProps {
  /** DB row this live session is writing. Null disables writes (no row yet / create failed). */
  gameId: number | null
}

/** Debounced write of the live SaveDoc to this session's game row (`POST /games/save?id=`). */
const LocalGameAutosave = ({ gameId }: LocalGameAutosaveProps) => {
  const { exportSaveDoc, gameState } = useGame()
  const exportRef = useRef(exportSaveDoc)
  exportRef.current = exportSaveDoc
  const gameIdRef = useRef(gameId)
  gameIdRef.current = gameId

  useEffect(() => {
    if (gameId == null) return
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      void saveGameJson(exportRef.current(), gameId, ac.signal).catch(() => {
        /* server down: keep playing in memory */
      })
    }, AUTOSAVE_MS)
    return () => {
      window.clearTimeout(timer)
      ac.abort()
    }
  }, [gameState, gameId])

  useEffect(() => {
    return () => {
      const id = gameIdRef.current
      if (id == null) return
      void saveGameJson(exportRef.current(), id).catch(() => {
        /* ignore */
      })
    }
  }, [])

  return null
}

export default LocalGameAutosave
