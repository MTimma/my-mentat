import { CustomEffect } from "../types/GameTypes";

export const PLAY_EFFECT_TEXTS: Partial<Record<CustomEffect, string>> = {
    [CustomEffect.HELENA_SIGNET_RING]: "Remove and replace a card in the Imperium Row. During your Reveal turn this round, you may acquire the removed card for 1 Persuasion less.",
    [CustomEffect.OTHER_MEMORY]: "Draw a Bene Gesserit card from your discard pile.",
    [CustomEffect.CARRYALL]: "Double the base (not bonus) spice you harvest with this agent",
    [CustomEffect.GUN_THOPTER]: "Each opponent loses 1 garrisoned troop.",
    [CustomEffect.SECRETS_STEAL]: "Steal intrigue from player with 4 or more",
    [CustomEffect.POWER_PLAY]: "Gain Two influence instead of one.",
    [CustomEffect.BOUNTY_INFILTRATION_BONUS]: "+2 Solari when infiltrating onto an occupied space.",
    [CustomEffect.GUILD_ACCORD_HEIGHTLINER_DISCOUNT]: "Heighliner costs 2 spice less this turn.",
    [CustomEffect.WEB_OF_POWER]: "Gain rewards for each faction you have 2+ influence with.",
    [CustomEffect.WEIRDING_WAY_EXTRA_TURN]: "Take another turn after this one.",
    [CustomEffect.IXIAN_ENGINEER_VP]: "Trash this card for 1 VP if you have 3+ tech tiles.",
    [CustomEffect.NEGOTIATED_WITHDRAWAL]: "Retreat 3 troops from the Conflict to gain 1 influence.",
    [CustomEffect.DESERT_AMBUSH]: "Each troop you deployed this turn forces an enemy retreat.",
    [CustomEffect.TREACHERY_DOUBLE_INFLUENCE]: "Gain 2 influence per faction icon on this card, then trash it.",
    [CustomEffect.REVEREND_MOTHER_MOHIAM]: "If you have another Bene Gesserit card in play, each opponent discards two cards.",
    [CustomEffect.TEST_OF_HUMANITY]: "Each opponent chooses: Discard a card -OR- Lose a deployed troop.",
    [CustomEffect.THE_VOICE]: "Choose any board space. Opponents can't send their next Agents there this round.",
    [CustomEffect.SHUFFLE_DISCARD_INTO_DECK]: "Shuffle your discard pile into your deck.",
    [CustomEffect.CANNON_TURRETS]: "Each opponent retreats 1 dreadnought from the Conflict.",
    [CustomEffect.STRATEGIC_PUSH]: "If you win this Conflict: +2 Solari.",
    [CustomEffect.SECOND_WAVE]: "Deploy up to 2 units from your garrison to the Conflict.",
    [CustomEffect.WAR_CHEST]: "Endgame: +1 VP if you have 10+ Solari.",
    [CustomEffect.ADVANCED_WEAPONRY]: "Combat: +4 strength if you have 3 tech.",
    [CustomEffect.GRAND_CONSPIRACY]: "Endgame VP from dreadnoughts, SMF, influence, and High Council.",
    [CustomEffect.STRONGARM]: "+1 influence on the faction where you placed an Agent this turn.",
    [CustomEffect.QUID_PRO_QUO]: "+1 influence on each faction track where you have an Agent.",
    [CustomEffect.DIVERSION]: "When you deploy 4 units to the Conflict this turn: +1 on the Shipping track.",
    [CustomEffect.MACHINE_CULTURE]: "Endgame: +1 VP if you have 3 tech.",
    [CustomEffect.IXIAN_PROBE]: "Discard 2 cards, then draw 2 cards.",
    [CustomEffect.CULL]: "Pay 1 Solari to trash 1 card.",
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