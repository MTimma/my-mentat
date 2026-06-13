import React, { createContext, useContext, type RefObject } from 'react'

export interface PlayBoardModalContextValue {
  boardContainerRef: RefObject<HTMLElement | null>
  /** Desktop play: scope modal overlays to the board stage (.play-shell-board). */
  scopeModalsToBoard: boolean
}

const PlayBoardModalContext = createContext<PlayBoardModalContextValue>({
  boardContainerRef: { current: null },
  scopeModalsToBoard: false,
})

export function PlayBoardModalProvider({
  boardContainerRef,
  scopeModalsToBoard,
  children,
}: PlayBoardModalContextValue & { children: React.ReactNode }) {
  return (
    <PlayBoardModalContext.Provider value={{ boardContainerRef, scopeModalsToBoard }}>
      {children}
    </PlayBoardModalContext.Provider>
  )
}

export function usePlayBoardModalContext(): PlayBoardModalContextValue {
  return useContext(PlayBoardModalContext)
}
