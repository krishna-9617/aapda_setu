# Aapda Setu

Hazard-based red-zone identification, carrying-capacity assessment and immediate
relocation planning for vulnerable habitations.
Built for **SIH 2026 &mdash; problem statement SIH26191** (Ministry of Home Affairs,
Disaster Management). Study area: **Barpeta district, Assam**.

FastAPI + Google OR-Tools CP-SAT backend, React + Vite + Leaflet frontend.

---

## Quick start

Two terminals.

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The server generates a baseline plan on startup. You should see:

```
INFO [aapda_setu.api] Baseline plan generated on startup: status=OPTIMAL objective=... assignments=6
```

Interactive API docs: <http://127.0.0.1:8000/docs>

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:5173>. `npm run dev` reads `.env.development`, which points at
`http://127.0.0.1:8000`.

---

## Deriving the real geographic inputs

The system does **not** consume pre-scored hazard values. It computes them from raw
geographic data. Two one-time scripts populate the caches; both need internet access and
neither runs at request time.

```bash
cd backend

python -m geo.fetch_dem            # SRTM/NASADEM tile  -> data/cache/barpeta_dem.tif
python -m geo.fetch_hydrography    # river centrelines  -> data/cache/barpeta_waterways.geojson
python -m geo.derive_hazard --compare

python -m geo.fetch_roads          # OSM road graph     -> data/cache/barpeta_roads.graphml
python -m geo.derive_routes --compare
```

`--compare` prints the old CSV values side by side with the newly derived ones.

Restart the backend afterwards. `data_loader.py` picks up `derived_hazard.json` and
`derived_routes.json` automatically.

**If you skip these**, nothing breaks. Habitations fall back to the CSV columns and routes
fall back to straight-line estimates &mdash; and every affected record is flagged
`csv_fallback` / `straight_line_estimate` in the API response, so the UI shows what is real
and what is not rather than hiding the difference.

---

## What the hazard scores are, and are not

Scores reflect **relative physical exposure patterns**. They are **not**:

- a probability, return period, or annual exceedance frequency
- hydraulic or hydrodynamic model output (no discharge, stage, conveyance or
  rainfall-runoff routing is computed anywhere)
- a substitute for CWC / ASDMA hazard zonation or any official flood map
- a statement about any individual building, plot or household

Each score is a weighted composite of measured signals: channel proximity (exponential
decay), height above the local drainage datum (HAND proxy), terrain flatness, and slope for
landslide. Weights renormalise across the signals that were actually measurable, so a
missing DEM shifts weight onto the signals that exist instead of scoring the missing ones as
zero &mdash; a zero would read as safety, and there is no evidence of safety in a measurement
that was never taken. Every score carries a `provenance` block naming its signals, its
effective weights, and anything unavailable.

---

## Data Honesty — ML Feature Mapping

The flood susceptibility model (`ml/flood_model.pkl`) is a Logistic Regression trained on the
Kaggle dataset **naiyakhalid/flood-prediction-dataset** (1,117,957 rows, 20 features after
excluding `id`). 5-fold cross-validated AUC: **0.9275 ± 0.0007**. It blends at 25% weight with
the geographic `flood_score` from `derive_hazard.py`.

Not all 20 model features can be computed from the data currently available.
This table documents exactly what each feature receives at inference time and why:

| Feature | Value used | Source | Status |
|---|---|---|---|
| `MonsoonIntensity` | `flood_score × 10` (clamped 0–10) | `derive_hazard.py` flood proximity score | **Real-derived** |
| `PopulationScore` | `population % 10` | `habitations.csv` population estimate | **Real (estimated)** |
| `TopographyDrainage` | 5 (dataset median) | HAND is `null` — DEM not yet fetched | Median fallback |
| `DrainageSystems` | 5 (dataset median) | Same as above — no DEM | Median fallback |
| `Deforestation` | 5 (dataset median) | No land-cover data; terrain-flatness rejected as proxy (causal link too weak) | Median fallback |
| All 15 remaining features | 5 (dataset median) | No meaningful proxy in current dataset | Median fallback |

**The model was retrained without the `id` column.** The original model was trained with `id`
(a sequential Kaggle row counter) as feature 0. Its coefficient was 7.094e-9 (contribution = 0
to any prediction), but its presence caused a 20-vs-21 feature mismatch that silently disabled
the ML blend for every habitation. The retrained model has 20 features and works correctly.

When `fetch_dem` succeeds, `TopographyDrainage` and `DrainageSystems` should be updated to use
`elev_rel_drainage_m` (HAND value) scaled to [0,10]. When land-cover data is available,
`Deforestation` should use it. Until then, median=5 is explicitly documented as a placeholder,
not a measurement.

---



The relocation-alert SMS shown after a plan approval is simulated by default. Wiring up a
real Twilio trial account is safe to do for a demo, because Twilio's own trial restriction
is exactly the safety boundary you want: **a trial account can only send to phone numbers
you've explicitly verified in the Twilio console** &mdash; up to 5 of them, shared across
Messaging/Voice/WhatsApp. `backend/sms.py` adds a second boundary on top of that: no
function in that file accepts a phone number as an argument, so there is no code path by
which real habitation data (which has no phone numbers in this dataset anyway) could reach
Twilio even by mistake.

1. **Create a trial account** at [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
   &mdash; no credit card required. Twilio gives you a small trial credit and either assigns
   or lets you claim one Twilio phone number to send from.
2. **Find your credentials** on the Console dashboard at
   [console.twilio.com](https://console.twilio.com): your **Account SID** and **Auth
   Token** are both right there, and your trial **Twilio phone number** is under Phone
   Numbers.
3. **Verify your own team's numbers** at Console &rarr; **Products & Services** &rarr;
   **Numbers & Senders** &rarr; **Verified caller IDs** &rarr; *Add a new Caller ID*. Enter
   the number, choose SMS or a call for the verification code, and enter the code Twilio
   sends you. Do this for each of the 1&ndash;2 team numbers you want the demo to reach.
4. **Set four environment variables** before starting the backend (never commit these):
   ```bash
   export TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   export TWILIO_AUTH_TOKEN=your_auth_token
   export TWILIO_PHONE_NUMBER=+1xxxxxxxxxx        # your Twilio trial number
   export VERIFIED_DEMO_PHONE_NUMBERS=+91XXXXXXXXXX,+91YYYYYYYYYY  # E.164 format, comma-separated
   ```
   All four must be set for real dispatch to activate; if any are missing, approvals fall
   back to the exact simulated behaviour that ran before this feature existed &mdash; a
   plan approval must never fail because SMS isn't configured.
5. Trigger any event and approve the resulting plan. `GET /alerts/sent` reports `"mode":
   "live"` once configured, and each alert carries Twilio's real message SID and delivery
   status (`queued`, `sent`, `delivered`, or `failed`). The UI badge switches from
   **Simulated** to **Live via Twilio** automatically, and always shows the same honesty
   line regardless of mode: *"Demo SMS sent to verified team numbers only &mdash;
   production would integrate with district-authority-managed citizen contact lists."*

**One thing worth checking during setup, not assumed here:** Twilio's exact trial rules for
messaging into India specifically (as opposed to US numbers, which currently need a
toll-free number and free toll-free verification to send SMS at all) can shift, so confirm
the current requirement for your sign-up country on Twilio's own trial documentation before
relying on it for a live demo.

**What I could not test from this sandbox:** this environment's network only reaches
package registries and GitHub &mdash; a direct request to `api.twilio.com` returns `403
host_not_allowed`, the same restriction that blocks the DEM/OSM/road-network fetches
elsewhere in this README. `backend/tests/test_sms.py` verifies everything that's actually
testable without a live account (the fallback is the default, every one of the three
required conditions is independently enforced, and no code path can select a destination
outside the verified allowlist), but a real SMS landing on a real phone has to be checked
on a machine with normal internet access and real credentials.

---

## Layout

```
backend/
  main.py              FastAPI app, endpoints, plan state, approval workflow
  optimizer.py         CP-SAT model + greedy fallback + naive baseline
  data_loader.py       CSV + derived-artifact loading, ML blending
  event_simulator.py   Bridge collapse, capacity drop, rainfall
  plan_health.py       Unmet-demand diagnosis and interventions
  site_filtering.py    Four-stage shelter eligibility
  sensitivity.py       Classification stability under weight perturbation
  system_status.py     Live module-overview probes
  geo/
    region.py          Study-area constants and cache paths
    fetch_dem.py       One-time DEM download
    fetch_hydrography.py  One-time waterway download (OSM, Natural Earth fallback)
    fetch_roads.py     One-time OSM road graph download
    terrain.py         Horn slope + height-above-drainage
    hydrography.py     Geodesic distance to nearest channel
    hazard_model.py    The documented combination function
    derive_hazard.py   CLI: writes data/derived_hazard.json
    routing.py         k-shortest road paths, redundancy-preserving
    derive_routes.py   CLI: writes data/derived_routes.json
  tests/               pytest suite (153 tests)

frontend/
  src/styles/design-system.css   Shared tokens, surfaces, type scale, motion
  src/components/ModuleOverview.jsx   Live module grid
  src/components/MeshBackground.jsx   Single shared ambient layer
  src/pages/                     6 pages
```

---

## Tests

```bash
cd backend
python -m pytest tests -v          # 153 tests, no server needed
```

Frontend:

```bash
cd frontend
npm run build                      # production build
npm run lint                       # oxlint
```

---

## Known issues

**Fixed since the initial build** (see git history / commit messages if you keep one):

- ~~CORS defaulted to `allow_origins=["*"]` with credentials enabled whenever `ALLOWED_ORIGINS`
  was unset~~ — the computed localhost-only default list was built but then silently
  ignored by the middleware call. Fixed: the default list is what actually reaches
  `CORSMiddleware` now. Verified with a live request carrying an unknown `Origin` header
  (correctly gets no `Access-Control-Allow-Origin` back) against a known dev origin
  (correctly allowed).
- ~~Both ML models were reloaded from disk on every single habitation~~ — `joblib.load()`
  was called inside the per-habitation loop in `data_loader.py`, so 5 habitations meant 5
  redundant unpickles of a 320 KB RandomForest per `load_data()` call (visible as the same
  sklearn version-mismatch warning repeating 5 times in the startup log). Fixed: both models
  load once, outside the loop. This scales properly now — a real district with thousands of
  habitations won't multiply model-loading cost by habitation count. Verified: baseline
  objective and every `ml_contribution` value are byte-identical before/after the fix.
- ~~The backend loaded all data and recomputed classification stability twice on every
  startup~~ — once at module import, again in `_generate_baseline()` on the lifespan hook.
  Fixed: module-level globals are now placeholders; `_generate_baseline()` is the only thing
  that populates them, called once at startup.
- **Frontend bundle was a single 658 KB chunk.** Routes are now `React.lazy()`-loaded, one
  chunk per page. Main entry chunk is down to ~282 KB; `Dashboard` (the heaviest page, with
  Leaflet) loads its own ~160 KB `MapView` chunk only when visited.
- **Dashboard, What-If, Field Report, and Audit Log had genuinely new layouts built** —
  not just new colours on the old skeleton. Dashboard's sidebar went from one long scroll to
  three tabs (Queue / Actions / More) plus a new KPI strip (population, unmet demand,
  objective — animated, derived from state already in hand, no new fetches). Field Report
  went from four always-visible cards to a single-choice incident-type selector. What-If's
  flat result grid became a baseline-vs-simulated comparison strip with a delta indicator.
  Audit Log's table became a vertical activity timeline. Every handler, state variable, and
  API call was preserved exactly — verified with a real headless-Chrome script that clicks
  through every tab, selects habitations, runs a simulation, and submits reports (27/27
  checks), not just page-load smoke tests.
- ~~`WhatIfPage`'s resizable split-panel drag handle never resized anything~~ — the ref meant
  to receive the panel's DOM node was declared but never attached (`leftPanelRef` was never
  passed as a `ref` prop), so the mouse-move handler's null-check silently no-opped on every
  drag. Fixed by attaching the ref. `FieldReportPage`'s identical pattern already had this
  right.
- ~~Dashboard's sidebar had no way to collapse~~ — `isSidebarOpen` state and the show/hide
  animation around it already existed, and a `.hamburger-btn` exemption was already sitting
  in the click-outside handler anticipating one, but no button ever called `setIsSidebarOpen`.
  Added the button using that exact anticipated class name.

**Still open:**

~~**The ML flood model does not run.**~~ **Fixed** — the flood model was retrained without the
`id` column (see "Data Honesty" section above). `ml_contribution` is now non-null for all
habitations and `auc: 0.9275` is the real 5-fold CV figure. The landslide model's
`auc: 1.000` caution still stands — it runs and contributes, but that AUC figure reflects
degenerate class imbalance in the training set, not a meaningful discriminative score.

**DEM and OSM road-network derivation require real internet access.** Run these once on a
machine with open internet:

```bash
python -m geo.fetch_dem
python -m geo.fetch_hydrography
python -m geo.fetch_roads
python -m geo.derive_hazard
python -m geo.derive_routes
```

Until then, every habitation's landslide score and every route's geometry use the CSV /
straight-line fallback, clearly flagged as such in the API response.

**Habitation and site coordinates are estimated, not surveyed.** The CSVs' own `notes`
column says so directly ("Manually jittered fallback coords. Population/scores estimated.").
Every derived slope, drainage-height and river-distance number is only as accurate as these
points. Swap in real coordinates and every derived score recomputes from them automatically.

**Map tiles need internet.** `MapView` pulls OpenStreetMap raster tiles; without a
connection the map renders markers and routes over an empty background.

**No authentication, in-memory-only state, and no code-splitting further than routes** are
the fastest things to point out if a judge asks about production-readiness rather than
prototype quality — all fine for a hackathon demo, all real if this goes further.
