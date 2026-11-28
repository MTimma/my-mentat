import { FactionType } from '../../types/GameTypes'
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
  
  r2a: { id: 'r2a', bonus: { specimen: 1 }, next: ['r3a', 'r3b'] },
  r2b: { id: 'r2b', bonus: { tleilaxu: 1 }, next: ['r3b', 'r3c'] },

  r3a: { id: 'r3a', bonus: { research: 1 }, next: ['r4a', 'r4b'] },
  r3b: { id: 'r3b', bonus: { trash: 1, specimen: 1 }, next: ['r4b', 'r4c'] },
  r3c: { id: 'r3c', bonus: { tleilaxu: 1, specimen: 1 }, next: ['r4b', 'r4c'] },
  // First genetic marker.
  r4a: { id: 'r4a', bonus: { tleilaxu: 1 }, next: ['r5a', 'r5b'], geneLevel: 1 },
  r4b: { id: 'r4b', bonus: { specimen: 1 }, next: ['r5b', 'r5c'], geneLevel: 1 },
  r4c: { id: 'r4c', bonus: { research: 1 }, next: ['r5c'], geneLevel: 1 },

  
  r5a: { id: 'r5a', bonus: { research: 1 }, next: ['r6a', 'r6b'], geneLevel: 1 },
  r5b: { id: 'r5b', bonus: { specimen: 1 }, next: ['r6b', 'r6c'], geneLevel: 1 },
  r5c: { id: 'r5c', bonus: { solari: 1 }, next: ['r6c'], geneLevel: 1 },
  
  r6a: { id: 'r6a', bonus: { spice: 1 }, next: ['r7a', 'r7b'], geneLevel: 1 },
  r6b: { id: 'r6b', bonus: { tleilaxu: 1 }, next: ['r7b', 'r7c'], geneLevel: 1 },
  r6c: {
    id: 'r6c', bonus: {
      influence: {
        chooseOne: true,
        amounts: [
          { faction: FactionType.BENE_GESSERIT, amount: 1 },
          { faction: FactionType.FREMEN, amount: 1 },
          { faction: FactionType.SPACING_GUILD, amount: 1 },
          { faction: FactionType.EMPEROR, amount: 1 }
        ]
      }
    }, next: ['r7c'], geneLevel: 1
  },
  r7a: { id: 'r7a', bonus: { tleilaxu: 1 }, next: ['r8a', 'r8b'], geneLevel: 1 },
  // Optional: discard 1 intrigue card for a draw + intrigue.
  r7b: { id: 'r7b', bonus: { drawCards: 1, intrigueCards: 1 }, cost: { intrigue: 1 }, next: ['r8b', 'r8c'], geneLevel: 1 },
  r7c: { id: 'r7c', bonus: { trash: 1, specimen: 1 }, next: ['r8c'], geneLevel: 1 },

  // Second genetic marker (end of track). After here, Research draws a card instead.
  r8a: { id: 'r8a', bonus: { spice: 2 }, next: [], geneLevel: 2 },
  r8b: { id: 'r8b', bonus: { tleilaxu: 1 }, next: [], geneLevel: 2 },
  // Optional: pay 7 solari for 2 Tleilaxu advances.
  r8c: { id: 'r8c', bonus: { tleilaxu: 2 }, cost: { solari: 7 }, next: [], geneLevel: 2 },
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

/** First genetic marker column. Nodes at or after it carry `geneLevel >= 1`. */
export const FIRST_GENETIC_MARKER_NODE_ID = 'r3a'

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
  // The first marker is a whole column (r3a/r3b/r3c), so a single `next`-walk
  // from one node would miss sibling branches. `geneLevel` is set on every node
  // at or after the marker, which makes it the reliable check.
  return geneLevelForNode(nodeId) >= 1
}
