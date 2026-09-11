# AAPDA SETU — PROTOTYPE BUILD SCOPE
## Screening Round Edition (Not the Full Vision Document)

**SIH26191** | Ministry of Home Affairs / NDRF | Disaster Management
**Deadline: 30 September 2026**
**Goal: Qualify screening round, target Top 5. Ship one tight working loop, not everything in the master concept.**

> Rule for the whole team: if a feature isn't in Section 2 (BUILD list) below, it does not get coded. If priorities shift, edit this file first — not the code.

---

## 1. What We Are Actually Demoing (Golden Demo Path)

One district. One hazard. One optimizer. One live failure. One re-plan.

```
Load Barpeta flood + population + shelter data
        ↓
Show Red-Zone map + ranked vulnerable habitations
        ↓
Run CP-SAT optimizer → feasible relocation assignment displayed
        ↓
Click "Bridge Collapse" event
        ↓
System auto-detects invalidated routes → re-optimizes
        ↓
Revised plan shown + explainability card + solver status
```

This 6-step loop is the entire product for screening purposes. Nothing outside it gets stage time or build hours.

---

## 2. BUILD List (🟢 — code this, nothing more)

| # | Component | Scope for prototype |
|---|---|---|
| 1 | Flood hazard scoring | 1 district (Barpeta), Census 2011 + Bhuvan flood layer, static/CSV — no live feed |
| 2 | Vulnerability + Priority score | Basic formula from doc, hardcoded weights |
| 3 | Red-Zone classification | Simple threshold bands |
| 4 | Candidate site filtering | Stages 1–2 only (hazard + terrain reject), skip stage 3–4 nuance |
| 5 | Effective capacity engine | Full `min(space, water, sanitation, health, food, road, safety)` formula — cheap to build, strong differentiator |
| 6 | CP-SAT optimizer | Core assignment with hard constraints (capacity, closed routes, population conservation) |
| 7 | Event simulator | Exactly **2 events**: bridge collapse, shelter capacity drop |
| 8 | Dynamic re-optimization | Auto-invalidate + re-solve on event trigger |
| 9 | Solver status display | "OPTIMAL, gap 0%, 1.8s" shown on screen — proves it's not a black box |
| 10 | Map dashboard | MapLibre/Leaflet — hazard zones, habitations, shelters, assignment lines |
| 11 | Explainability card | Why this habitation → this shelter (1 card, on click) |

---

## 3. STUB List (🟡 — simplified, functional, not polished)

| Component | What "stubbed" means here |
|---|---|
| Route feasibility | OSM travel-time only, not full network-flow model |
| Plan versioning | Just a plan-ID + "superseded" flag, no history UI |
| Human approve/reject | Approve/Reject buttons work; "Modify" = free-text note, no re-edit UI |
| Data provenance tag | Stored in data model, not surfaced with polish in UI |
| Offline cache | Basic local cache so demo survives a wifi drop — invisible, must not break |
| Greedy fallback | Build alongside optimizer as a safety net if CP-SAT times out — don't over-invest |

---

## 4. ROADMAP — Slide Only, Never Code

Do not spend build hours here. Present as "production vision" on 1 slide.

- Landslide / erosion / cloudburst hazard layers
- Multi-district / national scale
- Predictive ML hazard layer
- SMS/IVR live citizen alert dispatch (mock only if shown at all)
- Sachet (NDMA) live integration
- Multi-resource (relief supply) optimization
- Post-event feedback/recalibration loop
- Role-based multi-stakeholder views
- Full audit-log UI

---

## 5. Tech Stack

- **Data/Scoring:** Python, pandas, GeoPandas
- **Optimization:** Google OR-Tools CP-SAT
- **Backend:** FastAPI (or Flask) serving assignment + event endpoints
- **Frontend/Map:** React + MapLibre/Leaflet
- **Data sources:** Bhuvan/NRSC flood layer, SRTM DEM, OSM roads, Census 2011 (scaled), Assam SDMA shelter list — synthetic fallback wherever real access isn't confirmed by Day 3

---

## 6. Day-by-Day Plan (21 Days to 30 Sept)

| Days | Work |
|---|---|
| 1–3 | Collect data (Bhuvan, OSM, Census, SDMA shelter list); confirm access or fall back to synthetic |
| 4–8 | Hazard scoring + vulnerability/priority model + effective capacity engine |
| 9–12 | CP-SAT optimizer: decision variables, objective, hard constraints, solver status output |
| 13–16 | Event simulator (2 events) + re-optimization trigger + explainability card |
| 17–19 | Map dashboard wiring + integration testing |
| 20 | PPT build |
| 21 | Rehearsal + buffer |

Add 2–3 days slack before the deadline if possible — don't plan to Day 30 exactly.

---

## 7. Screening PPT (6 slides)

1. **Problem + Gap** — SIH26191 statement + research gap sentence (existing DSS is static, treats capacity as fixed physical number)
2. **Solution** — the 6-step Golden Demo Path diagram (Section 1 above)
3. **Tech Architecture** — stack + CP-SAT rationale (why not min-cost-flow / plain ILP / GA)
4. **Feasibility/Uniqueness** — baseline-vs-Aapda-Setu comparison table
5. **Impact + Roadmap** — where multi-hazard, ML, SMS, Sachet, national scale go *("future production scope")*
6. **Team + Timeline**

---

## 8. Jury Q&A to Rehearse (pick the top 5 from full doc)

- Why optimization, not nearest-shelter?
- What if CP-SAT times out? → greedy fallback, labeled as heuristic
- What if internet fails? → offline-first, cached layers
- Your population data is 2011 — 15 years stale? → acknowledged, scaled with growth-rate projections
- What scale did you actually test at? → be honest about demo-district size vs national claim

---

## 9. Hard Rule for the Team

Every feature request during the build gets one question: **"Is this one of the 6 steps in the Golden Demo Path?"**

- Yes → build it, in the BUILD or STUB tier above.
- No → it goes on the roadmap slide, not in the repo.
