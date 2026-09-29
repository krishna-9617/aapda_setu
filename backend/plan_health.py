# =====================================================================================================
# Applied verbatim from the verified proposal (STATUS LOG, Part 8); only this banner was edited. Tests:
# backend/tests/test_plan_health.py.
#
# What it does differently (all measured against the real optimizer - see STATUS LOG, Part 8):
#   * capacity suggestions are capped at the gap to the next-lowest resource, because effective capacity is the
#     MIN of six resources; sites where two resources tie for lowest are skipped (raising one gains nothing)
#   * every suggestion carries `estimated_impact` (an upper bound); the response gains `combined_estimated_impact`
#     and `coverage`
#   * up to MAX_SHOWN suggestions when the gap is large; NOTE this extension path is not exercised by any real
#     scenario in this dataset (only 3 sites are eligible), so tests exercise it on synthetic full sites
#   * route suggestions are the ORIGINAL logic, but with estimated_impact = 0 (unverified; a route to an eligible
#     site with exactly enough spare seats left unmet demand unchanged) and are never used to pad the list
# Verified: baseline output identical to the original; in 4 large-gap scenarios every estimate >= measured real
# effect (an UPPER bound: real effect is <= estimate, up to ~3x lower). Coverage is honestly low for large gaps
# (86%/27%/18%/12% in the four tested scenarios).
# =====================================================================================================
# How many interventions to surface.
#   MIN_SHOWN     - always show up to this many (it is what the UI always showed, so small-gap output is unchanged).
#   MAX_SHOWN     - hard ceiling, for UI cleanliness.
#   COVERAGE_TARGET - beyond MIN_SHOWN keep adding distinct interventions until their combined ESTIMATED impact
#                     reaches this share of the unmet demand (or MAX_SHOWN / the candidates run out).
MIN_SHOWN = 3
MAX_SHOWN = 5
COVERAGE_TARGET = 0.9
CAPACITY_CHUNK = 500  # "meaningful chunk" for a single capacity suggestion

_RESOURCE_KEYS = (
    "capacity_space", "capacity_water", "capacity_sanitation",
    "capacity_health", "capacity_food", "capacity_road",
)


def calculate_plan_health(current_plan, habitations, sites, routes):
    if not current_plan:
        return {"status": "UNKNOWN", "unmet_demand_total": 0, "interventions": []}

    unmet_total = sum(current_plan.get("unmet_demand", {}).values())
    status = "HEALTHY" if unmet_total == 0 else "AT RISK"

    # Every candidate carries `estimated_impact`: an UPPER BOUND, in people, on what that one intervention
    # can add. It is never larger than a single-resource upgrade can physically deliver (see headroom below).
    candidates = []

    if unmet_total > 0:
        # Calculate site utilization
        site_usage = {sid: 0 for sid in sites}
        for a in current_plan["assignments"]:
            site_usage[a["site_id"]] += a["people_count"]

        # Find bottlenecks
        for sid, usage in site_usage.items():
            site = sites[sid]
            eff_cap = site["effective_capacity"]
            if eff_cap > 0 and usage >= eff_cap:
                # This site is full. What is the limiting resource?
                resources = {key: site[key] for key in _RESOURCE_KEYS}
                limiting_resource = min(resources, key=resources.get)

                # Effective capacity is the MIN of these six resources, so raising the limiting one only helps
                # until it reaches the next-lowest resource. If two resources tie for lowest, raising just one
                # gains nothing at all - so it is not offered (it would claim an impact it cannot deliver).
                ordered = sorted(resources.values())
                headroom = ordered[1] - ordered[0]
                if headroom <= 0:
                    continue

                increase_amount = min(unmet_total, CAPACITY_CHUNK, headroom)
                candidates.append({
                    "id": f"cap_{sid}_{limiting_resource}",
                    "type": "increase_capacity",
                    "site_id": sid,
                    "resource_type": limiting_resource,
                    "amount": increase_amount,
                    "estimated_impact": increase_amount,
                    "title": f"Increase {limiting_resource.replace('capacity_', '')} at {site['name']}",
                    "description": f"Increase {limiting_resource.replace('capacity_', '')} by {increase_amount} units to accommodate more people.",
                    "impact": f"May resolve up to {increase_amount} unmet demand."
                })

        # Find spare capacity  (unchanged from the original logic)
        spare_caps = []
        for sid, usage in site_usage.items():
            site = sites[sid]
            spare = site["effective_capacity"] - usage
            if spare > 0:
                spare_caps.append((spare, sid))

        if spare_caps:
            spare_caps.sort(reverse=True)
            best_spare, best_sid = spare_caps[0]

            # Find habitation with unmet demand
            for hid, unmet in current_plan.get("unmet_demand", {}).items():
                if unmet > 0:
                    # Check if route exists
                    route_exists = False
                    for r in routes.values():
                        if r["from_habitation_id"] == hid and r["to_site_id"] == best_sid and r["status"] == "open":
                            route_exists = True
                            break
                    if not route_exists:
                        hab_name = habitations[hid]["name"]
                        site_name = sites[best_sid]["name"]
                        # estimated_impact is 0 ON PURPOSE: spare seats + a new route do not imply the solver will use
                        # it (measured: a route to an eligible site with exactly enough spare seats left unmet demand
                        # unchanged), so this text is a suggestion, not a number we count towards coverage.
                        candidates.append({
                            "id": f"route_{hid}_{best_sid}",
                            "type": "open_route",
                            "habitation_id": hid,
                            "site_id": best_sid,
                            "estimated_impact": 0,
                            "title": f"Open emergency route: {hab_name} to {site_name}",
                            "description": f"Establish a new transit route to {site_name}, which has {best_spare} spare capacity.",
                            "impact": f"Could route {min(unmet, best_spare)} currently stranded people."
                        })
                        break

    # Best-first (stable, so equal impacts keep discovery order: capacity suggestions, then routes).
    ranked = sorted(candidates, key=lambda c: -c["estimated_impact"])
    chosen = ranked[:MIN_SHOWN]
    combined = sum(c["estimated_impact"] for c in chosen)
    for extra in ranked[MIN_SHOWN:MAX_SHOWN]:
        if combined >= COVERAGE_TARGET * unmet_total or extra["estimated_impact"] <= 0:
            break  # covered enough - or only zero-impact suggestions are left (never pad the list with those)
        chosen.append(extra)
        combined += extra["estimated_impact"]

    return {
        "status": status,
        "unmet_demand_total": unmet_total,
        "interventions": chosen,
        # Sum of the per-intervention upper bounds (capped at the gap) and the share of the gap it represents.
        # For very large gaps this can honestly be well below 1.0: these single-resource upgrades cannot close it.
        "combined_estimated_impact": min(combined, unmet_total),
        "coverage": round(min(combined, unmet_total) / unmet_total, 2) if unmet_total else 1.0,
    }
