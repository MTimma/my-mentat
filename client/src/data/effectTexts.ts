import { CustomEffect } from "../types/GameTypes";

export const PLAY_EFFECT_TEXTS: Partial<Record<CustomEffect, string>> = {
    [CustomEffect.OTHER_MEMORY]: "Draw a Bene Gesserit card from your discard pile.",
    [CustomEffect.CARRYALL]: "Double the base (not bonus) spice you harvest with this agent",
    [CustomEffect.GUN_THOPTER]: "Each opponent loses 1 garrisoned troop.",
}

export const EFFECT_DISABLED_TEXTS: Partial<Record<CustomEffect, string>> = {
    [CustomEffect.OTHER_MEMORY]: "No Bene Gesserit cards in discard pile.",
}

export const REVEAL_EFFECT_TEXTS: Partial<Record<CustomEffect, string>> = {
    [CustomEffect.GUN_THOPTER]: "You may deploy a troop from your garrison to the Conflic.",
}