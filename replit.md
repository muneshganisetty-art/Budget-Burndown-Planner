# Budget Burndown Planner

An annual workforce-budget planner for data engineering managers, with an editable roster, annual project allocations, and a projected payroll surplus/deficit view.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server on its managed workflow
- `pnpm --filter @workspace/budget-burndown run dev` — run the web app on its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Workbook data is kept in the private App Storage bucket. The server creates a workbook with starter rows on first use and migrates an existing local workbook if present.
- Optional env: `BUDGET_WORKBOOK_PATH` — legacy local workbook path used only for one-time migration

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Data store: ExcelJS workbook in private Replit App Storage
- Validation: generated Zod schemas
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, TanStack Query, Wouter
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/budget-burndown/src/App.tsx` — dashboard, employee roster, and budget-entry screens
- `artifacts/budget-burndown/src/index.css` — app visual system and responsive styles
- `artifacts/api-server/src/lib/budgetWorkbook.ts` — workbook storage and data operations
- `artifacts/api-server/src/routes/workforce.ts` — employee, budget, and dashboard API
- `lib/api-spec/openapi.yaml` — source API contract

## Architecture decisions

- The Excel workbook is the source of truth; its `Employees` and `Budgets` sheets hold the editable records.
- Budget entries include a plan year so allocations can be selected and summed per annual projection.
- Employee salary projection uses hourly rate × 2,080 hours/year and prorates by active calendar days; accrued spend is an estimate using the same daily rate through today.
- An employment end date of `9999-12-31` represents ongoing employment.

## Product

- View annual budget, accrued payroll estimate, projected payroll, budget balance, and a month-by-month trajectory.
- Add, update, search, and remove employee records and annual budget entries.
- Change the projection year; view positive projected balance or deficit against total year funding.

## User preferences

- The user asked for Excel workbook storage rather than a database backend.

## Gotchas

- Keep the workbook in private App Storage; do not place salary records in a public object path.
- API `format: date` values must remain `YYYY-MM-DD` strings at the HTTP boundary even though generated Zod schemas coerce them to `Date`.
- Workbook mutations are serialized within the API process to avoid overwriting concurrent changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
