import { useEffect, useRef } from 'react'
import { upsertLocalGame } from '../../save/localGamesStore'
import { useGame } from '../GameContext/gameContextState'

const AUTOSAVE_MS = 500

interface LocalGameAutosaveProps {
  /** IndexedDB draft id. Null disables writes. */
  localGameId: string | null
}

/** Debounced SaveDoc write to IndexedDB. */
const LocalGameAutosave = ({ localGameId }: LocalGameAutosaveProps) => {
  const { exportSaveDoc, gameState } = useGame()
  const exportRef = useRef(exportSaveDoc)
  exportRef.current = exportSaveDoc
  const localIdRef = useRef(localGameId)
  localIdRef.current = localGameId

  useEffect(() => {
    if (localGameId == null) return
    const timer = window.setTimeout(() => {
      void upsertLocalGame(localIdRef.current!, exportRef.current()).catch(() => {
        /* quota / private mode: keep playing in memory */
      })
    }, AUTOSAVE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [gameState, localGameId])

  useEffect(() => {
    return () => {
      const localId = localIdRef.current
      if (localId == null) return
      void upsertLocalGame(localId, exportRef.current()).catch(() => {
        /* ignore */
      })
    }
  }, [])

  return null
}

export default LocalGameAutosave
