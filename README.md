# ClientCheck

An internal operating console for the FlytBase Customer Success team. Account
health, portfolio, risk, renewals, churn and support tooling in one application,
with an agent/tool-calling layer over a Supabase backend.

Operator console, not a marketing dashboard: dark by default, flat surfaces,
zero border radius, dense tables, restrained motion.

## Running it

```bash
npm install
npm run dev
```

The app runs without any configuration. Unconfigured it uses the local fallback
dataset and says so on every page, in the top bar, and per dataset in Settings.

## Supabase

Project ref `kufvqlqkmqnacicnritb`. Configuration is read from environment
variables only.

```bash
cp .env.example .env
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server
```

To create the tables and load them with the same rows the fallback uses, paste
`supabase/schema.sql` into the project's SQL editor. It creates five tables,
enables row level security on all of them and grants the `anon` role select
access only. Regenerate it after changing any dataset:

```bash
npm run seed:sql
```

Settings shows the live connection state, per-table readability, measured
latency, and which datasets came from Supabase versus the fallback.

### Credential handling

Vite inlines every `VITE_`-prefixed variable into the browser bundle, so the
only Supabase credential this frontend may ever hold is the **publishable anon
key**, paired with row level security on every table.

- A `service_role` key, an `sb_secret_` key or a database password supplied to a
  `VITE_` variable is **detected and refused at startup** rather than used. No
  request is made with it.
- Only a six-character prefix and four-character suffix of the key is ever
  rendered, in Settings.
- `.env` is gitignored. `.env.example` carries no values.
- Anything genuinely secret belongs in a Supabase edge function, never here.

## Structure

```
src/
  app/          shell: store, sidebar, top bar with global search, view switch
  views/        the seven primary sections
  account/      Account 360 workspace, tabs, Quick Info rail
  tools/        tool contracts and the tool registry
  lib/          types, Supabase client and probe, repository, formatting
  data/         local fallback datasets and account activity builders
  styles/       design tokens, self-hosted fonts, base layer
supabase/       generated schema and seed
scripts/        seed generator
```

## Tool calling

`src/tools/types.ts` defines one abstraction: a tool owns its `name`,
`description`, `inputSchema`, `validate` and `execute`. React components never
query a data source directly; they invoke a tool and render the invocation
record. Adding a tool means adding an entry to `src/tools/registry.ts`, with no
change to the calling interface.

Shipped tools: `get_customer_health`, `get_open_tickets`, `get_renewal_details`.

Every invocation moves through: input validation, execution, the data source
that actually answered, then a structured response, with elapsed time per phase.
Handled states are idle, calling, success, empty result, invalid input, error and
database unavailable.

The parameter form in the execution panel is generated from `inputSchema`, so a
new tool gets its UI for free.

## Honesty rules the code enforces

The prototype is explicit about what is real, because a CS console that quietly
invents numbers is worse than no console.

- A dataset is reported as Supabase-sourced **only** when Supabase returned rows
  for it. An empty table, a missing table or an error falls back and is labelled
  as fallback, with the reason carried into the UI.
- The tool execution panel prints `SUPABASE` only for a real query. On fallback
  it prints `LOCAL DATASET` and names the table it would have read.
- Writes report whether they reached Supabase. Unconfigured, the edit still
  applies to session state and the activity feed records "held in this session
  only".
- Actions with no backing system (Login, Sync, Business Review) log an
  explicitly simulated event: "no external system was contacted".
- The connection probe distinguishes a rejected key, an absent schema and an RLS
  block, and gives the matching remedy.

## Deliberate deviations from the brief

- **No Lora accent in the Account 360 header.** The brief asks for one Lora
  italic accented word per section heading. The Account 360 heading is a company
  name, and splitting a proper noun to italicise its last word produces
  "Meridian Mining *Co.*". The seven primary sections each carry exactly one
  Lora accent; this drill-down leads with the account identity instead.
- **The Dashboard account table drops two columns.** At the specified 70/30
  split a 1200px shell leaves the table about 750px, which will not hold nine
  columns at this density. The compact variant drops Industry and CSAT (industry
  moves to the account cell's second line) rather than hiding half the row behind
  a scrollbar. My Portfolio, at full width, shows all nine.
- **Eyebrow labels use `--dsc`, not `--dm`.** At 10px, `--dm` on a raised
  surface is 2.3:1, which is not readable. `--dsc` keeps them quiet at 5.4:1.
- **The active nav item uses `--de`, not `--ds`.** The sidebar is already `--ds`,
  so `--ds` would be invisible; `--de` is the raised step against it. The 2px
  Signal Orange left edge is as specified.
- **Fictional websites use the reserved `.example` TLD** so no invented account
  can resolve to a real company's domain.
- **"Today" is pinned to 2026-08-21** in `src/lib/format.ts` so renewal
  countdowns, quarter grouping and QBR ages stay consistent with the demo
  dataset. Switch to `new Date()` against live data.

## Naming

The product is **ClientCheck**. The tool identifiers in the agent layer
(`get_customer_health`, `get_open_tickets`, `get_renewal_details`) are the API
surface and keep their names: renaming the product does not rename its calls.

## Data

Every company name is fictional. No real FlytBase customer appears anywhere.
CSMs are identified by initials.

Fallback datasets: 14 active accounts, 15 tickets, 7 churned accounts, 12 months
of churn rate. Ticket rows and `Account.openTickets` are reconciled exactly, so
the Support Tools summary and the per-account metric cannot disagree.
