"""
HC-03 Hospital Bed Allocation - Baseline Policies Module
=========================================================
Implements standard comparative baselines specified in challenge requirements:
1. FIFO Policy: Allocates beds in strict arrival time order to the least-specialized
   available compatible bed.
2. Acuity-First Policy: Prioritizes higher acuity patients (Level 3 > Level 2 > Level 1),
   tie-breaking by arrival time.
3. Weighted-Wait Policy: Prioritizes by acuity waiting weight * elapsed waiting time.
4. Specialized-Preserving Policy: Strictly reserves beds for their preferred acuity class
   (General for L1, Monitored for L2, Critical for L3) with zero cross-allocation.
"""

from typing import List, Dict, Optional, Tuple, Any
from patient_generator import (
    BED_CAPACITIES,
    BED_COMPATIBILITY,
    PREFERRED_BED,
    ACUITY_WAITING_WEIGHTS,
    PatientObservation
)


class FIFOPolicy:
    """Baseline 1: First-In First-Out allocation."""
    name = "FIFO"

    def __init__(self, capacities=None, compatibility=None):
        self.capacities = capacities or BED_CAPACITIES.copy()
        self.compatibility = compatibility or BED_COMPATIBILITY.copy()

    def decide(
        self,
        waiting_patients: List[PatientObservation],
        current_occupancy: Dict[str, int],
        current_time: float
    ) -> Optional[Tuple[int, str, float, str]]:
        if not waiting_patients:
            return None

        free_beds = {k: self.capacities[k] - current_occupancy.get(k, 0) for k in self.capacities}
        if sum(free_beds.values()) <= 0:
            return None

        # Sort strictly by arrival time
        sorted_patients = sorted(waiting_patients, key=lambda p: (p.arrival_time, p.arrival_order))

        for p in sorted_patients:
            for bed in self.compatibility[p.acuity]:
                if free_beds[bed] > 0:
                    priority_score = round(p.elapsed_wait, 2)
                    reason = f"FIFO allocation in arrival order (wait: {p.elapsed_wait:.1f}m)"
                    return (p.patient_id, bed, priority_score, reason)

        return None


class AcuityFirstPolicy:
    """Baseline 2: Acuity-first allocation (Level 3 > Level 2 > Level 1)."""
    name = "Acuity First"

    def __init__(self, capacities=None, compatibility=None):
        self.capacities = capacities or BED_CAPACITIES.copy()
        self.compatibility = compatibility or BED_COMPATIBILITY.copy()

    def decide(
        self,
        waiting_patients: List[PatientObservation],
        current_occupancy: Dict[str, int],
        current_time: float
    ) -> Optional[Tuple[int, str, float, str]]:
        if not waiting_patients:
            return None

        free_beds = {k: self.capacities[k] - current_occupancy.get(k, 0) for k in self.capacities}
        if sum(free_beds.values()) <= 0:
            return None

        # Sort by acuity descending, then arrival time ascending
        sorted_patients = sorted(
            waiting_patients,
            key=lambda p: (-p.acuity, p.arrival_time, p.arrival_order)
        )

        for p in sorted_patients:
            for bed in self.compatibility[p.acuity]:
                if free_beds[bed] > 0:
                    priority_score = round(p.acuity * 100.0 + p.elapsed_wait, 2)
                    reason = f"Acuity-first priority (Acuity Level {p.acuity}, wait: {p.elapsed_wait:.1f}m)"
                    return (p.patient_id, bed, priority_score, reason)

        return None


class WeightedWaitPolicy:
    """Baseline 3: Acuity weight multiplied by waiting time."""
    name = "Weighted Wait"

    def __init__(self, capacities=None, compatibility=None):
        self.capacities = capacities or BED_CAPACITIES.copy()
        self.compatibility = compatibility or BED_COMPATIBILITY.copy()

    def decide(
        self,
        waiting_patients: List[PatientObservation],
        current_occupancy: Dict[str, int],
        current_time: float
    ) -> Optional[Tuple[int, str, float, str]]:
        if not waiting_patients:
            return None

        free_beds = {k: self.capacities[k] - current_occupancy.get(k, 0) for k in self.capacities}
        if sum(free_beds.values()) <= 0:
            return None

        # Sort by (waiting_weight * elapsed_wait) descending
        sorted_patients = sorted(
            waiting_patients,
            key=lambda p: (-(p.waiting_weight * p.elapsed_wait), p.arrival_time)
        )

        for p in sorted_patients:
            for bed in self.compatibility[p.acuity]:
                if free_beds[bed] > 0:
                    priority_score = round(p.waiting_weight * p.elapsed_wait, 2)
                    reason = (
                        f"Weighted-wait priority: w={p.waiting_weight} * wait={p.elapsed_wait:.1f}m "
                        f"(score={priority_score})"
                    )
                    return (p.patient_id, bed, priority_score, reason)

        return None


class SpecializedPreservingPolicy:
    """Baseline 4: Strict native bed reservation with zero cross-acuity spillover."""
    name = "Specialized Preserving"

    def __init__(self, capacities=None, compatibility=None):
        self.capacities = capacities or BED_CAPACITIES.copy()
        self.compatibility = compatibility or BED_COMPATIBILITY.copy()

    def decide(
        self,
        waiting_patients: List[PatientObservation],
        current_occupancy: Dict[str, int],
        current_time: float
    ) -> Optional[Tuple[int, str, float, str]]:
        if not waiting_patients:
            return None

        free_beds = {k: self.capacities[k] - current_occupancy.get(k, 0) for k in self.capacities}
        if sum(free_beds.values()) <= 0:
            return None

        # Strictly assign to preferred bed type only (Level 1 -> General, 2 -> Monitored, 3 -> Critical)
        sorted_patients = sorted(waiting_patients, key=lambda p: (p.arrival_time, p.arrival_order))

        for p in sorted_patients:
            target_bed = PREFERRED_BED[p.acuity]
            if free_beds[target_bed] > 0:
                priority_score = round(p.waiting_weight * 10.0 + p.elapsed_wait, 2)
                reason = f"Specialized-preserving strict native bed assignment to {target_bed}"
                return (p.patient_id, target_bed, priority_score, reason)

        return None
