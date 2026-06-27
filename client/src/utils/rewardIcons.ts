import { RewardType } from '../types/GameTypes'

/**
 * Maps RewardType enum values to their corresponding icon file paths
 */
export const REWARD_ICON_MAP: Partial<Record<RewardType, string>> = {
  [RewardType.SPICE]: 'icon/spice.png',
  [RewardType.WATER]: 'icon/water.png',
  [RewardType.SOLARI]: 'icon/solari.png',
  [RewardType.VICTORY_POINTS]: 'icon/vp.png',
  [RewardType.INTRIGUE]: 'icon/intrigue.png',
  [RewardType.TROOPS]: 'icon/troop.png',
  [RewardType.POOL_TROOP]: 'icon/troop.png',
  [RewardType.NEGOTIATOR]: 'icon/tech_neg.png',
  [RewardType.INFLUENCE]: 'icon/bump.png',
  [RewardType.CONTROL]: 'icon/control.png',
  [RewardType.AGENT]: 'icon/agent.png',
  [RewardType.EXTRA_TURN]: 'icon/agent.png',
  [RewardType.COMBAT]: 'icon/sword.png',
  [RewardType.MENTAT]: 'icon/mentat.png',
  [RewardType.DRAW]: 'icon/draw.png',
  [RewardType.DISCARD]: 'icon/discard.png',
  [RewardType.TRASH]: 'icon/trash.png',
  [RewardType.RETREAT]: 'icon/retreat.png',
  [RewardType.DEPLOY]: 'icon/deploy.png',
  [RewardType.RECALL]: 'icon/recall.png',
  [RewardType.PERSUASION]: 'icon/persuasion.png',
  [RewardType.DREADNOUGHT]: 'icon/dreadnought_card.png',
}

/**
 * Gets the icon path for a given reward type, with fallback
 */
export function getRewardIcon(type: RewardType): string | null {
  return REWARD_ICON_MAP[type] || null
}

/**
 * Gets a display name for a reward type (fallback when no icon available)
 */
export function getRewardDisplayName(type: RewardType, name?: string): string {
  switch (type) {
    case RewardType.VICTORY_POINTS: return 'VP'
    case RewardType.INTRIGUE: return 'Intrigue'
    case RewardType.SOLARI: return 'Solari'
    case RewardType.SPICE: return 'Spice'
    case RewardType.WATER: return 'Water'
    case RewardType.INFLUENCE: return name || 'Influence'
    case RewardType.CONTROL: return 'Control'
    case RewardType.AGENT: return 'Agent'
    case RewardType.EXTRA_TURN: return 'Extra turn'
    case RewardType.COMBAT: return 'Combat'
    case RewardType.TROOPS: return 'Troops'
    case RewardType.POOL_TROOP: return 'Pool troop'
    case RewardType.NEGOTIATOR: return 'Negotiator'
    case RewardType.CARD: return name || 'Card'
    case RewardType.DRAW: return 'Draw'
    case RewardType.DISCARD: return 'Discard'
    case RewardType.TRASH: return 'Trash'
    case RewardType.RETREAT: return 'Retreat'
    case RewardType.DEPLOY: return 'Deploy'
    case RewardType.RECALL: return 'Recall'
    case RewardType.PERSUASION: return 'Persuasion'
    case RewardType.DREADNOUGHT: return 'Dreadnought'

    default: return type
  }
}

