import { CustomEffect } from "../types/GameTypes";

export const PLAY_EFFECT_TEXTS: Partial<Record<CustomEffect, string>> = {
    [CustomEffect.OTHER_MEMORY]: "Draw a Bene Gesserit card from your discard pile.",
    [CustomEffect.CARRYALL]: "Double the base (not bonus) spice you harvest with this agent",
    [CustomEffect.GUN_THOPTER]: "Each opponent loses 1 garrisoned troop.",
    [CustomEffect.SECRETS_STEAL]: "Steal intrigue from player with 4 or more",
    [CustomEffect.POWER_PLAY]: "Gain Two influence instead of one.",
    [CustomEffect.REVEREND_MOTHER_MOHIAM]: "If you have another Bene Gesserit card in play, each opponent discards two cards.",
    [CustomEffect.TEST_OF_HUMANITY]: "Each opponent chooses: Discard a card -OR- Lose a deployed troop.",
    [CustomEffect.THE_VOICE]: "Choose any board space. Opponents can't send their next Agents there this round.",
}

export const PLAY_EFFECT_DISABLED_TEXTS: Partial<Record<CustomEffect, string>> = {
    [CustomEffect.OTHER_MEMORY]: "No Bene Gesserit cards in discard pile.",
}

export const REVEAL_EFFECT_TEXTS: Partial<Record<CustomEffect, string>> = {
    [CustomEffect.GUN_THOPTER]: "You may deploy a troop from your garrison to the Conflic.",
    [CustomEffect.GUILD_BANKERS]: "The Spice Must Flow costs 3 Persuasion less to acquire this turn."
}

export const REVEAL_EFFECT_DISABLED_TEXTS: Partial<Record<CustomEffect, string>> = {
}