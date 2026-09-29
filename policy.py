"""
HC-03 Hospital Bed Allocation - Final Online Policy Module
===========================================================
Implements the final hybrid online bed-allocation policy designed specifically
for the HC-03 scoring function.

Key design principles:
1. Strict Online Separation: Receives only immutable observation objects of
   already-arrived waiting patients and current bed occupancy. Never accesses
   future arrivals, future realized LOS, or hidden simulator state.
2. Acuity Priority & Utility Alignment:
   - Level 3 (Weight 8, dedicated 20pt Ucritical) has absolute priority for Critical beds.
   - Level 2 (Weight 3) prioritized for Monitored beds.
   - Level 1 (Weight 1) prioritized for General beds.
3. Strict Zero Avoidable Specialized Violations:
   - Level 1 NEVER assigned Monitored/Critical if General has free beds.
   - Level 2 NEVER assigned Critical if Monitored has free beds.
4. Strategic Specialized Capacity Protection:
   - Critical capacity is scarce (5 beds). Level 2 patients only escalate
     to Critical if Monitored is full, no Level 3 is waiting, and either the Level 2
     patient is approaching the 240-min timeout or ample Critical buffer exists.
5. Starvation Protection & Rejection Prevention:
   - Non-linear aging bonus escalates sharply as elapsed wait approaches 240 min,
     preventing low-acuity starvation and optimizing the 15-point Ureject.
"""

from typing import List, Dict, Optional, Tuple, Any
from patient_generator import (
    BED_CAPACITIES,
    BED_COMPATIBILITY,
    PREFERRED_BED,
    ACUITY_WAITING_WEIGHTS,
    MEDIAN_LOS,
    REJECTION_THRESHOLD,
    PatientObservation
)


class BedAllocationPolicy:
    """
    Online Hospital Bed Allocation Policy.
    Clean API strictly decoupled from simulator internals.
    """

    def __init__(
        self,
        capacities: Optional[Dict[str, int]] = None,
        compatibility: Optional[Dict[int, List[str]]] = None,
        distributions: Optional[Dict[str, Any]] = None
    ):
        self.capacities = capacities or BED_CAPACITIES.copy()
        self.compatibility = compatibility or BED_COMPATIBILITY.copy()
        self.distributions = distributions or {
            "median_los": MEDIAN_LOS.copy(),
            "weights": ACUITY_WAITING_WEIGHTS.copy(),
            "rejection_threshold": REJECTION_THRESHOLD
        }

    def decide(
        self,
        waiting_patients: List[PatientObservation],
        current_occupancy: Dict[str, int],
        current_time: float
    ) -> Optional[Tuple[int, str, float, str]]:
        """
        Make a single online allocation decision.
        
        Args:
            waiting_patients: List of immutable PatientObservation records currently waiting.
            current_occupancy: Current number of occupied beds by type {'General', 'Monitored', 'Critical'}.
            current_time: Current simulation clock time.

        Returns:
            Tuple of (patient_id, assigned_bed_type, priority_score, human_readable_reason)
            or None if no feasible or strategically sound assignment can be made.
        """
        if not waiting_patients:
            return None

        # Calculate currently free beds
        free_beds = {
            bed_type: self.capacities[bed_type] - current_occupancy.get(bed_type, 0)
            for bed_type in self.capacities
        }

        if sum(free_beds.values()) <= 0:
            return None

        # Group waiting patients by acuity for situational awareness
        waiting_by_acuity = {1: [], 2: [], 3: []}
        for p in waiting_patients:
            waiting_by_acuity[p.acuity].append(p)

        n_crit_waiting = len(waiting_by_acuity[3])
        n_mon_waiting = len(waiting_by_acuity[2])

        candidates = []

        for p in waiting_patients:
            elapsed_wait = p.elapsed_wait
            acuity = p.acuity
            weight = p.waiting_weight
            
            # --- Starvation & Aging Urgency Function ---
            # Normalized wait [0, 1]
            wait_ratio = min(elapsed_wait / REJECTION_THRESHOLD, 1.0)
            
            # Base linear + polynomial urgency
            urgency = (wait_ratio ** 1.6) * 120.0
            
            # Steep exponential ramp near the 240-minute rejection cliff
            if elapsed_wait >= 180.0:
                urgency += ((elapsed_wait - 180.0) / 30.0) ** 2 * 150.0
            if elapsed_wait >= 215.0:
                urgency += 400.0  # Emergency anti-rejection surge

            base_priority = (weight * 30.0) + urgency

            # Evaluate each compatible bed type
            for bed in self.compatibility[acuity]:
                if free_beds[bed] <= 0:
                    continue

                # Rule 1: Zero Avoidable Specialized Violations
                # Level 1 in Monitored/Critical while General is free -> FORBIDDEN
                if acuity == 1 and bed in ("Monitored", "Critical") and free_beds["General"] > 0:
                    continue

                # Level 2 in Critical while Monitored is free -> FORBIDDEN
                if acuity == 2 and bed == "Critical" and free_beds["Monitored"] > 0:
                    continue

                # Rule 2: Acuity-to-Bed Matching & Scarcity Governance
                is_preferred = (bed == p.preferred_bed)
                
                if acuity == 3:
                    # Level 3 MUST have Critical bed
                    if bed == "Critical":
                        score = base_priority * 3.5 + 800.0
                        reason = (
                            f"Critical acuity priority allocation (elapsed wait: {elapsed_wait:.1f}m; "
                            f"Critical free: {free_beds['Critical']}/{self.capacities['Critical']})"
                        )
                        candidates.append((score, p.patient_id, bed, reason))

                elif acuity == 2:
                    if bed == "Monitored":
                        # Preferred assignment for Level 2
                        score = base_priority + 300.0
                        reason = (
                            f"Monitored preferred bed assignment for Level-2 patient "
                            f"(elapsed wait: {elapsed_wait:.1f}m; free Monitored: {free_beds['Monitored']})"
                        )
                        candidates.append((score, p.patient_id, bed, reason))

                    elif bed == "Critical":
                        # Escalation: Monitored is full (guaranteed by Rule 1 above).
                        # Must protect Critical capacity for Level 3 unless justified.
                        # Condition A: No Level 3 is waiting AND (approaching timeout or healthy Critical buffer)
                        can_escalate = False
                        escalate_reason = ""
                        
                        if n_crit_waiting == 0:
                            if elapsed_wait >= 200.0:
                                can_escalate = True
                                escalate_reason = (
                                    f"Monitored full; Level-2 escalated to Critical to prevent 240m rejection "
                                    f"(elapsed wait: {elapsed_wait:.1f}m, zero Critical patients in queue)"
                                )
                            elif free_beds["Critical"] >= 2 and elapsed_wait >= 150.0:
                                can_escalate = True
                                escalate_reason = (
                                    f"Monitored full; Level-2 escalated to Critical with safe buffer "
                                    f"(free Critical: {free_beds['Critical']}, elapsed wait: {elapsed_wait:.1f}m)"
                                )

                        if can_escalate:
                            score = base_priority + 50.0
                            candidates.append((score, p.patient_id, bed, escalate_reason))

                elif acuity == 1:
                    if bed == "General":
                        # Preferred assignment for Level 1
                        score = base_priority + 150.0
                        reason = (
                            f"General bed available; least-specialized compatible assignment for Level-1 "
                            f"(elapsed wait: {elapsed_wait:.1f}m; free General: {free_beds['General']})"
                        )
                        candidates.append((score, p.patient_id, bed, reason))

                    elif bed == "Monitored":
                        # General is full. Can Level 1 escalate to Monitored?
                        # Only if no Level 2 is waiting and either approaching timeout or large buffer.
                        can_escalate = False
                        escalate_reason = ""
                        if n_mon_waiting == 0:
                            if elapsed_wait >= 200.0:
                                can_escalate = True
                                escalate_reason = (
                                    f"General full; Level-1 escalated to Monitored to prevent 240m rejection "
                                    f"(elapsed wait: {elapsed_wait:.1f}m, zero Level-2 patients in queue)"
                                )
                            elif free_beds["Monitored"] >= 3 and elapsed_wait >= 140.0:
                                can_escalate = True
                                escalate_reason = (
                                    f"General full; Level-1 escalated to Monitored with surplus capacity "
                                    f"(free Monitored: {free_beds['Monitored']}, elapsed wait: {elapsed_wait:.1f}m)"
                                )

                        if can_escalate:
                            score = base_priority + 30.0
                            candidates.append((score, p.patient_id, bed, escalate_reason))

                    elif bed == "Critical":
                        # Extreme emergency only: General and Monitored full, no L2 or L3 waiting, wait > 225m
                        if (
                            free_beds["General"] == 0 and
                            free_beds["Monitored"] == 0 and
                            n_crit_waiting == 0 and
                            n_mon_waiting == 0 and
                            elapsed_wait >= 225.0
                        ):
                            score = base_priority + 10.0
                            reason = (
                                f"Extreme emergency: Level-1 escalated to Critical at {elapsed_wait:.1f}m wait "
                                f"to avert imminent 240m rejection"
                            )
                            candidates.append((score, p.patient_id, bed, reason))

        if not candidates:
            return None

        # Sort candidates by descending priority score
        # Tie-breaker: earliest arrival time (arrival order)
        candidates.sort(key=lambda x: -x[0])
        best_candidate = candidates[0]
        
        # (patient_id, assigned_bed_type, priority_score, reason)
        return (best_candidate[1], best_candidate[2], round(best_candidate[0], 2), best_candidate[3])
