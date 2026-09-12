
import numpy as np

def compute_classification_stability(habitations):
    """
    Runs a vectorized risk-weight sensitivity check for N=300 iterations.
    Baseline weights for hazard and vulnerability are 0.5 and 0.5.
    Returns a dictionary mapping habitation_id -> stability ratio (0.0 to 1.0).
    """
    N = 300
    w_hazard_base = 0.5
    w_vuln_base = 0.5
    
    # Generate perturbed weights
    # w_prime = w * U(0.85, 1.15)
    u_hazard = np.random.uniform(0.85, 1.15, N)
    u_vuln = np.random.uniform(0.85, 1.15, N)
    
    w_h = w_hazard_base * u_hazard
    w_v = w_vuln_base * u_vuln
    
    # Normalize
    sums = w_h + w_v
    w_h = w_h / sums
    w_v = w_v / sums
    
    stability = {}
    
    for hid, hab in habitations.items():
        hazard = hab["hazard_score"]
        vuln = hab["vulnerability_score"]
        orig_band = hab["red_zone_band"]
        
        # Vectorized priority scores for this habitation across N runs
        priorities = w_h * hazard + w_v * vuln
        
        # Categorize into bands based on priorities
        # critical: >= 0.8
        # high: >= 0.6
        # moderate: >= 0.4
        # low: < 0.4
        
        if orig_band == "critical":
            matches = np.sum(priorities >= 0.8)
        elif orig_band == "high":
            matches = np.sum((priorities >= 0.6) & (priorities < 0.8))
        elif orig_band == "moderate":
            matches = np.sum((priorities >= 0.4) & (priorities < 0.6))
        else:
            matches = np.sum(priorities < 0.4)
            
        stability[hid] = float(matches) / N
        
    return stability

