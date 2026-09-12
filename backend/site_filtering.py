def filter_candidate_sites(habitation_id, habitations, sites, routes):
    """
    Filters sites for a given habitation through 4 sequential stages.
    Returns:
        candidate_sites: list of valid site IDs
        exclusions: list of strings describing why a site was excluded for this habitation
    """
    candidate_sites = []
    exclusions = []
    
    for site_id, site in sites.items():
        # Stage 1: Hazard Suitability
        if site.get('hazard_score', 0) > 0.7:
            exclusions.append(f"{site_id} ({site['name']}) excluded: Stage 1 - inside hazard zone (score {site['hazard_score']})")
            continue
            
        # Stage 2: Terrain Suitability
        if not site.get('terrain_safe', True):
            exclusions.append(f"{site_id} ({site['name']}) excluded: Stage 2 - poor elevation/drainage")
            continue
            
        # Stage 3: Infrastructure Suitability
        if site.get('effective_capacity', 0) == 0:
            exclusions.append(f"{site_id} ({site['name']}) excluded: Stage 3 - effective capacity is zero (resource depleted)")
            continue
            
        # Stage 4: Accessibility
        # Check if there is at least one OPEN route from this habitation to this site
        open_routes = [
            k for k, r in routes.items()
            if r['from_habitation_id'] == habitation_id 
            and r['to_site_id'] == site_id
            and r.get('status', 'open') == 'open'
        ]
        
        if not open_routes:
            # We don't want to list this if the habitation naturally doesn't have a route to this site,
            # or maybe we do. The prompt says: "reject sites with NO open route to that habitation"
            # It's useful to show, but for 5 sites and 5 habs, they might not all be connected by default.
            exclusions.append(f"{site_id} ({site['name']}) excluded: Stage 4 - no open route from {habitations[habitation_id]['name']}")
            continue
            
        # If all 4 stages pass, add to candidates
        candidate_sites.append(site_id)
        
    return candidate_sites, exclusions
