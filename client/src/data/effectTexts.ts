import { CustomEffect } from "../types/GameTypes";

export const effectTexts: Record<CustomEffect, string> = {
    [CustomEffect.OTHER_MEMORY]: "Draw a Bene Gesserit card from your discard pile.",
}

export const effectDisabledTexts: Record<CustomEffect, string> = {
    [CustomEffect.OTHER_MEMORY]: "No Bene Gesserit cards in discard pile.",
}