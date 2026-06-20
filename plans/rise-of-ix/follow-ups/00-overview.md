# Rise of Ix — Follow-up tasks (deferred)

Outstanding work identified after the main Tasks 01–10 landed. Each item
below is a **separate note task** an agent can pick up independently.

> **Gate rule (all follow-ups):** Implement behaviour **only when**
> `state.expansions.riseOfIx === true` (or `setup.expansions.riseOfIx`
> during sandbox setup). When the expansion is off, code paths must be
> identical to the pre-RoI base game — no new UI, no new reducer branches,
> no new gains logged.

Parent plan: [`../00-overview.md`](../00-overview.md).

---

## Status

| File | Topic | Depends on |
|------|--------|------------|
| [`01-unload-on-discard-trash.md`](./01-unload-on-discard-trash.md) | Unload Reveal on discard / trash | 02, 08 |
| [`02-conflict-rewards-freighter-tech.md`](./02-conflict-rewards-freighter-tech.md) | Combat resolution for FREIGHTER / TECH conflict rewards | 05, 06, 10 |
| [`03-tech-tile-activation-ui.md`](./03-tech-tile-activation-ui.md) | Activate buttons (Flagship, Holoprojectors, Sonic Snoopers, …) | 06 |
| [`04-tessia-snoopers-influence-ui.md`](./04-tessia-snoopers-influence-ui.md) | Full Tessia snooper tokens on influence tracks | 07 |

---

## Cross-cutting reminders

1. **Logging tool** — preserve manual decision points; record gains with
   clear source labels (e.g. `(Unload)`, `SHIPPING_TRACK`, `IX_BOARD`).
2. **Turn history** — new actions must be JSON-serializable and listed in
   `client/src/save/recording.ts` if they are top-level `GameAction` types.
3. **Sandbox** — any new editable fields belong in `SandboxPlayerEditor`
   when RoI is on; setup overlays must respect `expansions.riseOfIx`.
4. **Catalogs** — if new actions or card flags change external contracts,
   bump `CATALOG_SCHEMA_VERSION` and run `npm run generate:catalogs`.

---

## Suggested order

1. **02** — conflict rewards block Skirmish IV/V and Economy Supremacy payouts.
2. **01** — Unload is data-complete (`unload: true` on 8 unique RoI cards).
3. **03** — activation UI unlocks several “once per round” tiles.
4. **04** — Tessia UI is presentation-only; signet logic already exists.
