import { canonicalLeaderName, UNASSIGNED_LEADER_NAME } from '../data/leaders'

/** Custom player names, and the list label, stop at 20 characters. */
export const PLAYER_NAME_MAX_LENGTH = 20

type NamedSeat = {
  id: number
  leader: { name: string }
  name?: string
}

function cleanPlayerName(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim()
}

/** Strip control characters and collapse whitespace so the name stays one line. */
export function normalizeStoredPlayerName(value: string): string {
  return cleanPlayerName(value).slice(0, PLAYER_NAME_MAX_LENGTH)
}

/** Name written to the games list when the player has no custom name. */
export function defaultSavedPlayerName(player: NamedSeat): string {
  const leaderName = canonicalLeaderName(player.leader.name)
  if (leaderName !== UNASSIGNED_LEADER_NAME) return leaderName
  return `Player ${player.id + 1}`
}

/** Name that is saved for this player. A custom name wins. Not truncated for display. */
export function savedPlayerName(player: NamedSeat): string {
  const custom = player.name ? normalizeStoredPlayerName(player.name) : ''
  return custom || defaultSavedPlayerName(player)
}

/**
 * Full label for the games list. The list CSS shortens it with an ellipsis
 * when the column is narrower than the text.
 */
export function displayPlayerName(name: string): string {
  return canonicalLeaderName(name)
}

/** Label for one saved player, including a custom name that is still over the limit. */
export function listedPlayerName(player: NamedSeat): string {
  const custom = player.name ? cleanPlayerName(player.name) : ''
  return displayPlayerName(custom || defaultSavedPlayerName(player))
}

/**
 * Value to store on the player. Empty, or text that still matches the
 * current default, stays unset so a later leader change updates the name.
 */
export function storedPlayerName(draft: string, player: NamedSeat): string {
  const cleaned = cleanPlayerName(draft)
  if (cleaned === '' || cleaned === defaultSavedPlayerName(player)) return ''
  return cleaned.slice(0, PLAYER_NAME_MAX_LENGTH)
}

/**
 * Name written when sandbox setup Begin is clicked.
 * A custom name stays. An empty name becomes the leader name.
 */
export function playerNameOnBegin(player: NamedSeat): string {
  const custom = storedPlayerName(player.name ?? '', player)
  return custom || defaultSavedPlayerName(player)
}

/** Text shown in the setup name field. A stored leader name stays whole. */
export function playerNameFieldValue(player: NamedSeat): string {
  const raw = player.name ? cleanPlayerName(player.name) : ''
  if (!raw || raw === defaultSavedPlayerName(player)) return raw
  return normalizeStoredPlayerName(raw)
}
