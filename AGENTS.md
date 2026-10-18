# Realtime fintech dashboard (test monorepo)

Standalone Nx + Angular workspace for the market dashboard demo. Stack and conventions follow Medsi `ws/frontend` (`medex/backoffice.ui`), adapted for a personal GitHub repo.

## Workspace

- Nx 22, Angular 21, SCSS, esbuild application builder, Jest.
- App: `apps/market-dashboard`.
- `nx.json` sets `@nx/angular` generators to `standalone: false` (NgModule feature slices, not standalone components by default).
- HTTP and workers: only infrastructure services (e.g. `services/requests/*RequestService`, worker factory) touch `HttpClient` / `Worker`; components use domain/page services.

## Feature layout (Medsi)

Under `apps/market-dashboard/src/app/`:

- `modules/<feature>/` — `components/`, `pages/`, `shared/`, `services/`, `services/requests/`, `declarations/`.
- Module-internal components, directives, pipes: `standalone: false`, declared in the feature `NgModule`; export only from `shared/`.
- Shell/layout: navigation, router outlet, chrome; feature UI stays in slice folders.

## Code style

- Prettier: single quotes, `trailingComma: es5`, `arrowParens: avoid`, import sort (Angular → third party → relative).
- ESLint: Nx module boundaries, component line limits, no direct `*RequestService` imports in components.
- Templates: native `@if` / `@for`, `[class.*]` bindings; user-facing copy in HTML, not TS fields.
- No `::ng-deep` / shadow-piercing in styles.
- No comments or JSDoc in application source unless explicitly requested.
- Tailwind (when added): compose with `@apply`; avoid arbitrary `[…]` values.

## Git

- Local author: personal GitHub identity (not Medsi `includeIf` gitconfig).
- Commits: no Cursor co-author trailers.

## Reference

Full Medsi orchestrator rules and FE monorepo map: `ws/knowledge/frontend.md` and `ws/AGENTS.md` in the parent workspace (not vendored here).
