import { AgentIcon, DISPATCH_ENVOY_FACTION_ICONS } from '../types/GameTypes'

/** Union card agent icons with Dispatch an Envoy’s four faction icons (no duplicates). */
export function mergeDispatchEnvoyIcons(base: AgentIcon[]): AgentIcon[] {
  return [...new Set([...base, ...DISPATCH_ENVOY_FACTION_ICONS])]
}
