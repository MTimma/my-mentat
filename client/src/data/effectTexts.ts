import { CustomEffect } from "../types/GameTypes";

export const EFFECT_TEXTS: Record<CustomEffect, string> = {
    [CustomEffect.OTHER_MEMORY]: "Draw a Bene Gesserit card from your discard pile.",
}

export const EFFECT_DISABLED_TEXTS: Record<CustomEffect, string> = {
    [CustomEffect.OTHER_MEMORY]: "No Bene Gesserit cards in discard pile.",
}