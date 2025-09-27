# Implement card selection pop-up analysis
_Exported on 27/09/2025 at 9:31:33 EEST from Cursor (1.6.45)_

---

**User**

please analyze how to implement card selection pop-up on top of orRewards pop-up

will need it for OTHER_MEMORY custom effect to select whcih card from discard to get back in deck

and will need it also for trash reward

also, might need to reuse it for optionalEffect trash rewards or custom effects

do not write any code yet, provide examples


---

**Cursor**

Below is a design‐level walk-through (no code yet) of how you can layer a “pick a card” dialog on top of – or directly after – the existing “Choose one reward” (orRewards) pop-up and reuse the same mechanism for every place in the rules where a player must point at a specific card.

1. Unify interactive “questions” under one queue
   • Your `currTurn.pendingChoices` array already queues REWARD choices.  
   • Add a discriminator field, e.g. `type: 'REWARD_CHOICE' | 'CARD_SELECT' | 'CONFIRM' …`.  
   • The queue stays strictly FIFO: when one choice is resolved, you pop it and immediately render the next one (so you never physically “stack” two visible modals – they succeed each other).

        interface PendingChoiceBase {
          id: string           // uuid
          prompt: string
          source: { type: GainSource; id: number; name: string }
        }

        interface RewardChoice extends PendingChoiceBase {
          type: 'REWARD_CHOICE'
          options: { cost?: Cost; reward: Reward; disabled?: boolean }[]
        }

        interface CardSelectChoice extends PendingChoiceBase {
          type: 'CARD_SELECT'
          pile: 'HAND' | 'DISCARD' | 'DECK' | 'PLAY_AREA'
          filter?: (c: Card) => boolean      // optional card filter
          selectionCount: number             // 1 for OTHER_MEMORY, 1+ for future effects
          onResolve: (cardIds: number[]) => GameAction
        }

2. TurnControls acts as the “choice dispatcher”
   • Keep just one local modal flag, e.g. `activeChoice`, derived from the head of `pendingChoices`.  
   • Render component A or component B depending on `activeChoice.type`.

        if(activeChoice.type === 'REWARD_CHOICE')  → render the current ChoiceDialog you already have.  
        if(activeChoice.type === 'CARD_SELECT')   → render a new CardSelectPopup (can be the same JSX as `CardSearch`, only parameterised).

   • When the user confirms, call `onResolveChoice(choice.id, payload)` – GameContext removes that choice, processes the answer, and may push a new choice, so the UI refreshes with the next dialog instantly. ⇒ No z-index wars, only one visible overlay at a time.

3. Reusable CardSelectPopup
   • It’s basically your existing `CardSearch` + a wrapper div identical to the ChoiceDialog overlay.  
   • Props you will pass from `CardSelectChoice`:
       – `cards`: decide in GameContext (`DISCARD` → player.discardPile etc.).  
       – `selectionCount`.  
       – `text` coming from `choice.prompt`.  
   • When user confirms, call the `onResolve` callback carried inside the choice. That callback should dispatch a domain action (e.g. `MOVE_CARD_TO_TOP_OF_DECK`) so all state changes stay inside the reducer.

4. Example flows

   A) OTHER_MEMORY custom effect  
   “Reveal: You may take a card from your discard pile and put it on top of your deck.”

   • During reveal resolution in GameContext you detect the card:  
     – build a `CardSelectChoice` with `{ pile:'DISCARD', selectionCount:1, prompt:'Choose a card to place on top of your deck', onResolve:(ids)=>({type:'MOVE_CARD_TO_TOP', playerId, cardId: ids[0]}) }`  
     – push it into `pendingChoices`, keep `canEndTurn = false`.

   • UI shows reward choices first (if any). After the player answers those, pendingChoices[0] becomes the CardSelectChoice, the dispatcher switches modal to CardSelectPopup.  
   • Once they pick, GameContext moves the card and sets `canEndTurn = (pendingChoices.length===0)`.

   B) Trash reward on Conflict card  
   “2nd place: Trash 1 card from your hand or discard pile and gain 2 Solari.”

   • When GameContext awards the reward, immediately create a CardSelectChoice  
     – `pile:'HAND_DISCARD'` (you can expose both piles concatenated)  
     – `prompt:'Trash a card to gain 2 Solari'`  
     – `onResolve: (ids)=>({type:'TRASH_CARD', ...})`  
   • After resolve, award Solari, finish Combat phase.

   C) OptionalEffect that costs trashing any non-starter card  
   • When player clicks that effect button, TurnControls currently shows `CardSearch`. Replace that with pushing a CardSelectChoice the same way – TurnControls no longer needs ad-hoc trash UI, everything goes through the unified pipeline.

5. UX / corner-case notes
   • Because the dialogs never overlap, the user cannot click the “wrong” background layer.  
   • If you ever truly need nesting (e.g. confirm inside card-select) you can still push another choice before popping the first.  
   • Use the existing full-screen overlay CSS; if you later want stacked modals, simply add `z-index` in the choice type switch.

6. Security / reusability concerns
   • No secrets or env vars needed.  
   • All state transitions stay in GameContext → single source of truth, good for tests.  
   • CardSelectPopup is generic; works for discard recursion, trashing, selective breeding, Ixian Probe, etc.

By funnelling every “player decision” into `pendingChoices`, you obtain a predictable queue that the UI renders one at a time, letting you mix-and-match reward decisions, card selections, confirms, and future exotic effects without new custom pop-ups each time.

---

**User**

it does not make sense, one REWARD_CHOICE will be a CARD_SELECT

---

**Cursor**

Understood—if every time the user must pick a card that choice is itself “the reward,” we can keep one unified concept instead of two parallel ones.  Think of `PendingChoice` as “here is a question for the player.”  The payload of that question decides which widget you render:

```ts
type PendingChoice =
  | {
      id: string
      prompt: string
      kind: 'FIXED_OPTIONS'     // pick 1 of N labelled buttons
      options: { cost?: Cost; reward: Reward; disabled?: boolean }[]
    }
  | {
      id: string
      prompt: string
      kind: 'CARD_SELECT'       // pick 1..N cards out of a pile
      pile: 'HAND' | 'DISCARD' | 'HAND+DISCARD'
      filter?: (c: Card) => boolean
      selectionCount: number
      onResolve: (cardIds: number[]) => GameAction
    }
```

Key points:

1. Only one “choice” abstraction, still kept in the FIFO queue.
2. `kind` decides which overlay to render—either the current reward-button dialog or the card-grid dialog.
3. A reward that *is* “Trash a card → gain 2 Solari” is represented by pushing a `kind:'CARD_SELECT'` choice right away; there is no separate FIXED_OPTIONS step.
4. If you ever need a traditional reward option that *branches* into different card selections, you can do it in two stages:
   • first push a FIXED_OPTIONS choice;  
   • when the player clicks the option that involves a card, your reducer immediately pushes the follow-up CARD_SELECT choice.

This satisfies “one REWARD_CHOICE will be a CARD_SELECT” because the moment you need the player to point at a card you express that as the single choice object of type `CARD_SELECT`.

No separate REWARD_CHOICE vs CARD_SELECT types in the queue—just one discriminated union with `kind`.

```typescript
type PendingChoice =
  | {
      id: string
      prompt: string
      kind: 'FIXED_OPTIONS'     // pick 1 of N labelled buttons
      options: { cost?: Cost; reward: Reward; disabled?: boolean }[]
    }
  | {
      id: string
      prompt: string
      kind: 'CARD_SELECT'       // pick 1..N cards out of a pile
      pile: 'HAND' | 'DISCARD' | 'HAND+DISCARD'
      filter?: (c: Card) => boolean
      selectionCount: number
      onResolve: (cardIds: number[]) => GameAction
    }
```

---

**User**

for pile:
I would suggest to remove 'HAND+DISCARD'

add 'PLAY_AREA'

and need possibility to combine them, so maybe pile is a list containing these types?

---

**Cursor**

Makes sense.

Revised shape of the “card selection” choice:

```ts
type CardPile = 'HAND' | 'DISCARD' | 'DECK' | 'PLAY_AREA'

interface CardSelectChoice {
  id: string
  prompt: string
  kind: 'CARD_SELECT'
  piles: CardPile[]          // e.g. ['HAND','DISCARD'] or ['PLAY_AREA']
  filter?: (c: Card) => boolean
  selectionCount: number
  onResolve: (cardIds: number[]) => GameAction
}
```

Key updates:

1. `piles` is an array → you can pass any combination (`['HAND','DISCARD']`, `['PLAY_AREA']`, `['HAND','PLAY_AREA']`, …).  
2. The reducer gathers the cards to present with something like  
   ```ts
   const visibleCards = piles.flatMap(pile => getCardsFromPile(player, pile))
   ```  
3. `HAND+DISCARD` special value no longer needed.  
4. Added explicit `'PLAY_AREA'` pile, so effects like “trash a card you have already played” are covered.

Examples:

• OTHER_MEMORY effect  
  `piles: ['DISCARD']`

• Trash reward (“hand or discard”)  
  `piles: ['HAND','DISCARD']`

• Ixian Probe (“trash a card in play or in hand”)  
  `piles: ['HAND','PLAY_AREA']`

This keeps the schema flexible while avoiding bespoke combined tokens.

```typescript
type CardPile = 'HAND' | 'DISCARD' | 'DECK' | 'PLAY_AREA'

interface CardSelectChoice {
  id: string
  prompt: string
  kind: 'CARD_SELECT'
  piles: CardPile[]          // e.g. ['HAND','DISCARD'] or ['PLAY_AREA']
  filter?: (c: Card) => boolean
  selectionCount: number
  onResolve: (cardIds: number[]) => GameAction
}
```

```typescript
   const visibleCards = piles.flatMap(pile => getCardsFromPile(player, pile))
```



case CustomEffect.OTHER_MEMORY: {
  // Create a card selection choice for Bene Gesserit cards in discard pile
  const bgCards = currPlayer.discardPile.filter(c => c.faction?.includes(FactionType.BENE_GESSERIT))
  if(bgCards.length > 0) {
    const choiceId = card.name + '-OTHER_MEMORY-' + crypto.randomUUID();
    const cardSelectChoice: CardSelectChoice = {
      id: choiceId,
      kind: 'CARD_SELECT',
      prompt: 'Choose a Bene Gesserit card from your discard pile to place on top of your deck',
      piles: ['DISCARD'],
      filter: (c: Card) => c.faction?.includes(FactionType.BENE_GESSERIT) || false,
      selectionCount: 1,
      onResolve: (cardIds: number[]) => ({
        type: 'MOVE_CARD_TO_TOP_OF_DECK',
        playerId: currPlayer.id,
        cardId: cardIds[0]
      }),
      source: { type: GainSource.CARD, id: card.id, name: card.name }
    };
    tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices||[]), cardSelectChoice];
  }
  break
}