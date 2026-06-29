import type { Reward } from '../../types/GameTypes'

/** Genetic-marker level a player's research token has reached (0 = none). */
export type GeneLevel = 0 | 1 | 2

/**
 * A node on the branching research-track hex graph. Movement is always
 * rightward; `next` lists the valid forward branches (1–2 entries). When a node
 * sits in a column with a genetic marker, `geneColumn` records which marker
 * (1 = first, 2 = second/end).
 */
export interface ResearchNode {
  id: string
  /** Bonus gained immediately on entering this node. */
  bonus?: Reward
  /** Forward branch node ids (rightward). Empty ⇒ end of track. */
  next: string[]
  /**
   * Genetic-marker level a player has while their token sits on this node
   * (0 = before the first marker). `researchLevel` card requirements compare
   * against this. Omitted ⇒ inherits 0.
   */
  geneLevel?: GeneLevel
}

/** A space on the linear Tleilaxu (beetle) track. */
export interface TleilaxuTrackSpace {
  /** 0-based index along the track. */
  step: number
  /** Bonus gained on entering this space. */
  bonus?: Reward
  /** This space awards a Victory Point (and the first-player setup spice bonus). */
  victoryPoint?: boolean
}
