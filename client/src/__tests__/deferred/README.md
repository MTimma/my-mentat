# Deferred UI tests

These files are **not** executed by `npm run test` (excluded in `vite.config.ts`).

They were scaffolded early for layout/history checks but will need updates once UI contracts settle. Use [plans/base-game/06-ui-regression.md](../../../../plans/base-game/06-ui-regression.md) for manual QA until then.

To run one file manually after restoring deps (`jsdom`, `@testing-library/react`, `@testing-library/jest-dom`):

```bash
npx vitest run src/__tests__/deferred/boardLayout.test.ts
```
