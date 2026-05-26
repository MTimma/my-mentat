/**
 * Effect overlay regions on Imperium card art (`card-effects-dialog` preview).
 *
 * `left`, `top`, `width`, `height` are **direct** percentages of the card image
 * (0 = left/top edge, 100 = full width/height).
 *
 * Default regions: `agent` (play parchment), `reveal` (reveal parchment).
 * Per-card overrides: `CARD_EFFECT_LAYOUT_OVERRIDES` — `playEffects[i]` matches
 * `card.playEffect[i]` (see Power Play).
 *
 * Tune with **`?cardEffectDebug=1`**, then copy values here.
 */

import { Card, Cost, CustomEffect, PlayEffect, Reward, RevealEffect } from '../types/GameTypes'

export type CardEffectRegionId = 'agent' | 'reveal'

export interface CardEffectRect {
  left: number
  top: number
  width: number
  height: number
}

export interface CardEffectRegion extends CardEffectRect {
  id: CardEffectRegionId
}

export const CARD_EFFECT_REGION_IDS: CardEffectRegionId[] = ['agent', 'reveal']

export const CARD_EFFECT_REGIONS: Record<CardEffectRegionId, CardEffectRegion> = {
  agent: { id: 'agent', left: 4, top: 67, width: 93, height: 15 },
  reveal: { id: 'reveal', left: 7, top: 58, width: 86, height: 12 },
}

/** Per-card layout: index aligns with `playEffect` / `revealEffect` array on the card. */
export interface CardEffectLayoutOverride {
  playEffects?: CardEffectRect[]
  revealEffects?: CardEffectRect[]
}

export const CARD_EFFECT_LAYOUT_OVERRIDES: Record<string, CardEffectLayoutOverride> = {
  'Power Play': {
    playEffects: [
      // playEffect[0] — POWER_PLAY ("Gain two influence instead of one.")
      { left: 5, top: 67, width: 91, height: 8 },
      // playEffect[1] — trash this card
      { left: 5, top: 75, width: 91, height: 7 },
    ],
  },
  'Gurney Halleck': {
    revealEffects: [
      // revealEffect[0] — persuasion
      { left: 6, top: 79, width: 34, height: 18 },
      // revealEffect[1] — pay 3 solari → troops + deploy
      { left: 41, top: 79, width: 55, height: 18 },
    ],
  },
}

export function layoutCardRegionPercent(rect: CardEffectRect): {
  left: number
  top: number
  width: number
  height: number
} {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

export function rectPlacementKey(rect: CardEffectRect): string {
  return `${rect.left}|${rect.top}|${rect.width}|${rect.height}`
}

function playEffectIndexForTrash(effects: PlayEffect[]): number {
  return effects.findIndex(e => e.reward?.trashThisCard || e.reward?.trash)
}

function playEffectIndexForCustom(effects: PlayEffect[], custom: CustomEffect): number {
  return effects.findIndex(e => e.reward?.custom === custom)
}

function revealEffectIndexForTrash(effects: RevealEffect[]): number {
  return effects.findIndex(e => e.reward?.trashThisCard || e.reward?.trash)
}

function revealEffectIndexForCustom(effects: RevealEffect[], custom: CustomEffect): number {
  return effects.findIndex(e => e.reward?.custom === custom)
}

function effectCostRewardMatch(
  a: { cost?: Cost; reward: Reward },
  b: { cost?: Cost; reward: Reward }
): boolean {
  const costMatch =
    (a.cost?.spice ?? 0) === (b.cost?.spice ?? 0) &&
    (a.cost?.water ?? 0) === (b.cost?.water ?? 0) &&
    (a.cost?.solari ?? 0) === (b.cost?.solari ?? 0) &&
    Boolean(a.cost?.trash) === Boolean(b.cost?.trash) &&
    Boolean(a.cost?.trashThisCard) === Boolean(b.cost?.trashThisCard) &&
    (a.cost?.custom ?? '') === (b.cost?.custom ?? '')
  const rewardMatch =
    (a.reward.spice ?? 0) === (b.reward.spice ?? 0) &&
    (a.reward.water ?? 0) === (b.reward.water ?? 0) &&
    (a.reward.solari ?? 0) === (b.reward.solari ?? 0) &&
    (a.reward.troops ?? 0) === (b.reward.troops ?? 0) &&
    (a.reward.deployTroops ?? 0) === (b.reward.deployTroops ?? 0) &&
    (a.reward.drawCards ?? 0) === (b.reward.drawCards ?? 0) &&
    (a.reward.custom ?? '') === (b.reward.custom ?? '')
  return costMatch && rewardMatch
}

function optionalEffectIndex(
  effects: Array<{ cost?: Cost; reward: Reward; choiceOpt?: boolean }>,
  effect: { cost?: Cost; reward: Reward }
): number {
  return effects.findIndex(e => Boolean(e.cost) && !e.choiceOpt && effectCostRewardMatch(e, effect))
}

export function getDefaultOverlayRegionId(
  card: Card,
  opts: { isTrash: boolean; custom?: CustomEffect; isRevealed: boolean }
): CardEffectRegionId {
  const { isTrash, custom, isRevealed } = opts
  if (isTrash) {
    const trashOnPlay = card.playEffect?.some(e => e.reward?.trashThisCard || e.reward?.trash)
    const trashOnReveal = card.revealEffect?.some(e => e.reward?.trashThisCard || e.reward?.trash)
    if (trashOnReveal && !trashOnPlay) return 'reveal'
    return 'agent'
  }
  if (custom) {
    const onPlay = card.playEffect?.some(e => e.reward?.custom === custom)
    const onReveal = card.revealEffect?.some(e => e.reward?.custom === custom)
    if (onPlay && !onReveal) return 'agent'
    if (onReveal && !onPlay) return 'reveal'
  }
  return isRevealed ? 'reveal' : 'agent'
}

/** Resolve overlay rect for a pending trash/custom reward on this card. */
export function getRewardOverlayRect(
  card: Card,
  opts: {
    isTrash: boolean
    custom?: CustomEffect
    isRevealed: boolean
  }
): CardEffectRect {
  const override = CARD_EFFECT_LAYOUT_OVERRIDES[card.name]

  if (!opts.isRevealed && override?.playEffects?.length) {
    const effects = card.playEffect ?? []
    let index = -1
    if (opts.isTrash) index = playEffectIndexForTrash(effects)
    else if (opts.custom) index = playEffectIndexForCustom(effects, opts.custom)
    if (index >= 0 && override.playEffects[index]) {
      return override.playEffects[index]
    }
  }

  if (opts.isRevealed && override?.revealEffects?.length) {
    const effects = card.revealEffect ?? []
    let index = -1
    if (opts.isTrash) index = revealEffectIndexForTrash(effects)
    else if (opts.custom) index = revealEffectIndexForCustom(effects, opts.custom)
    if (index >= 0 && override.revealEffects[index]) {
      return override.revealEffects[index]
    }
  }

  const regionId = getDefaultOverlayRegionId(card, {
    isTrash: opts.isTrash,
    custom: opts.custom,
    isRevealed: opts.isRevealed,
  })
  return CARD_EFFECT_REGIONS[regionId]
}

/** Resolve overlay rect for an optional (paid) play/reveal effect on this card. */
export function getOptionalEffectOverlayRect(
  card: Card,
  effect: { cost?: Cost; reward: Reward },
  isRevealed: boolean
): CardEffectRect {
  const override = CARD_EFFECT_LAYOUT_OVERRIDES[card.name]
  const effects = isRevealed ? (card.revealEffect ?? []) : (card.playEffect ?? [])
  const index = optionalEffectIndex(effects, effect)

  if (index >= 0) {
    if (isRevealed && override?.revealEffects?.[index]) {
      return override.revealEffects[index]
    }
    if (!isRevealed && override?.playEffects?.[index]) {
      return override.playEffects[index]
    }
  }

  const regionId: CardEffectRegionId = isRevealed ? 'reveal' : 'agent'
  return CARD_EFFECT_REGIONS[regionId]
}

/** Outlines for ?cardEffectDebug=1 — per-card overrides or default agent/reveal. */
export function getCardEffectDebugRects(cardName: string): Array<{ key: string; rect: CardEffectRect }> {
  const override = CARD_EFFECT_LAYOUT_OVERRIDES[cardName]
  if (override?.playEffects?.length) {
    return override.playEffects.map((rect, index) => ({
      key: `play-${index}`,
      rect,
    }))
  }
  if (override?.revealEffects?.length) {
    return override.revealEffects.map((rect, index) => ({
      key: `reveal-${index}`,
      rect,
    }))
  }
  return CARD_EFFECT_REGION_IDS.map(id => ({
    key: id,
    rect: CARD_EFFECT_REGIONS[id],
  }))
}
