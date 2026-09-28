import type { GeneLevel, ResearchNode } from './types'

/**
 * Branching research-track hex graph. Movement is always rightward; at a branch
 * the player chooses which forward node to enter. Two genetic markers gate
 * `researchLevel` card effects: level 1 from the mid-track column, level 2 at
 * the end column.
 *
 * Logging-tool note: bonuses and layout approximate the printed track; the user
 * records outcomes, so exact pip values are not load-bearing. Tune freely.
 */
export const RESEARCH_START_NODE_ID = 'r0'

export const RESEARCH_NODES: Record<string, ResearchNode> = {
  r0: { id: 'r0', next: ['r1'] },
  r1: { id: 'r1', bonus: { specimen: 1 }, next: ['r2a', 'r2b'] },
  r2a: { id: 'r2a', bonus: { spice: 1 }, next: ['r3'] },
  r2b: { id: 'r2b', bonus: { solari: 2 }, next: ['r3'] },
  // First genetic marker.
  r3: { id: 'r3', bonus: { specimen: 1 }, next: ['r4'], geneLevel: 1 },
  r4: { id: 'r4', bonus: { drawCards: 1 }, next: ['r5a', 'r5b'], geneLevel: 1 },
  r5a: { id: 'r5a', bonus: { tleilaxu: 1 }, next: ['r6'], geneLevel: 1 },
  r5b: { id: 'r5b', bonus: { intrigueCards: 1 }, next: ['r6'], geneLevel: 1 },
  // Second genetic marker (end of track). After here, Research draws a card instead.
  r6: { id: 'r6', bonus: { victoryPoints: 1 }, next: [], geneLevel: 2 },
}

export function researchNode(nodeId: string | undefined): ResearchNode {
  return RESEARCH_NODES[nodeId ?? RESEARCH_START_NODE_ID] ?? RESEARCH_NODES[RESEARCH_START_NODE_ID]
}

/** Genetic-marker level for a token on the given node. */
export function geneLevelForNode(nodeId: string | undefined): GeneLevel {
  return researchNode(nodeId).geneLevel ?? 0
}

/** Forward branch options from a node (1–2 entries; empty ⇒ end of track). */
export function nextResearchNodes(nodeId: string | undefined): string[] {
  return researchNode(nodeId).next
}

/** True while the token sits on a second genetic marker. Further Research draws a card. */
export function isResearchComplete(nodeId: string | undefined): boolean {
  return geneLevelForNode(nodeId) >= 2
}

/** First genetic marker. Nodes from here forward (following `next`) have reached it. */
export const FIRST_GENETIC_MARKER_NODE_ID = 'r3'

/** True when the token is on `targetId` or on a node reached by moving forward from it. */
export function isResearchAtOrAfter(nodeId: string | undefined, targetId: string): boolean {
  const current = nodeId ?? RESEARCH_START_NODE_ID
  const seen = new Set<string>()
  const pending = [targetId]
  while (pending.length > 0) {
    const id = pending.pop()!
    if (id === current) return true
    if (seen.has(id)) continue
    seen.add(id)
    pending.push(...researchNode(id).next)
  }
  return false
}

export function hasFirstGeneticMarker(nodeId: string | undefined): boolean {
  return isResearchAtOrAfter(nodeId, FIRST_GENETIC_MARKER_NODE_ID)
}
