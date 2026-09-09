/** Public paths for full-board and overlay art (AVIF). */

export const DEFAULT_BOARD_IMAGE = '/board/Board.avif'

export const CHOAM_OVERLAY_SRC = '/board/riseofix/riseofix1.avif'
export const IX_BOARD_OVERLAY_SRC = '/board/riseofix/riseofix2.avif'

export const MENTAT_TAKEN_SRC = '/board/mentat_taken.avif'
export const MENTAT_TAKEN_ROI_SRC = '/board/riseofix/mentat_taken_3.avif'

/** Board images to warm as soon as the app boots (before play view mounts). */
export const EARLY_BOARD_IMAGE_URLS: readonly string[] = [
  DEFAULT_BOARD_IMAGE,
  CHOAM_OVERLAY_SRC,
  IX_BOARD_OVERLAY_SRC,
]
