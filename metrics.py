"""
HC-03 Hospital Bed Allocation - Metrics Module
===============================================
Computes evaluation metrics and scoring functions strictly adhering to HC-03 rules:
- Uwait (45 points): Acuity-weighted waiting utility, capped at 240 min.
- Ucritical (20 points): Critical patient waiting utility, capped at 240 min.
- Ureject (15 points): Rejection rate utility (1 - N_rejected / 500).
- Uspecialized (15 points): Avoidable specialized bed assignment utility.
- Runtime & Reproducibility (5 points).
"""

from typing import Dict, List, Any
import numpy as np
from patient_generator import ACUITY_WAITING_WEIGHTS, Patient, REJECTION_THRESHOLD


def calculate_metrics(
    patients: List[Patient],
    avoidable_specialized_count: int,
    bed_capacities: Dict[str, int],
    runtime_seconds: float,
    seed: int = 20260911,
    sim_end_time: float = 0.0
) -> Dict[str, Any]:
    """
    Calculate full evaluation suite for HC-03 benchmark.
    All utility metrics clipped to [0, 1].
    """
    n_patients = len(patients)
    if n_patients == 0:
        raise ValueError("Cannot calculate metrics for empty patient cohort.")

    admitted_patients = [p for p in patients if p.terminal_status == "ADMITTED"]
    rejected_patients = [p for p in patients if p.terminal_status == "REJECTED"]
    waiting_patients = [p for p in patients if p.terminal_status is None]

    n_admitted = len(admitted_patients)
    n_rejected = len(rejected_patients)
    n_waiting_at_end = len(waiting_patients)

    # All waiting times (capped at 240 for utility scoring)
    capped_waits = [min(p.waiting_time if p.waiting_time is not None else 240.0, REJECTION_THRESHOLD) for p in patients]
    raw_waits = [p.waiting_time if p.waiting_time is not None else 240.0 for p in patients]

    # 1. Weighted-Wait Utility (Uwait) - 45 points
    sum_weighted_capped_wait = sum(
        ACUITY_WAITING_WEIGHTS[p.acuity] * min(p.waiting_time if p.waiting_time is not None else 240.0, REJECTION_THRESHOLD)
        for p in patients
    )
    sum_weights = sum(ACUITY_WAITING_WEIGHTS[p.acuity] for p in patients)
    
    if sum_weights > 0:
        u_wait_raw = 1.0 - (sum_weighted_capped_wait / (REJECTION_THRESHOLD * sum_weights))
    else:
        u_wait_raw = 1.0
    u_wait = float(np.clip(u_wait_raw, 0.0, 1.0))

    # 2. Critical-Wait Utility (Ucritical) - 20 points
    critical_patients = [p for p in patients if p.acuity == 3]
    n_critical = len(critical_patients)
    if n_critical > 0:
        sum_critical_capped_wait = sum(
            min(p.waiting_time if p.waiting_time is not None else 240.0, REJECTION_THRESHOLD)
            for p in critical_patients
        )
        u_critical_raw = 1.0 - (sum_critical_capped_wait / (REJECTION_THRESHOLD * n_critical))
        critical_avg_wait = float(np.mean([p.waiting_time if p.waiting_time is not None else 240.0 for p in critical_patients]))
    else:
        u_critical_raw = 1.0
        critical_avg_wait = 0.0
    u_critical = float(np.clip(u_critical_raw, 0.0, 1.0))

    # 3. Rejection Utility (Ureject) - 15 points
    u_reject_raw = 1.0 - (n_rejected / float(n_patients))
    u_reject = float(np.clip(u_reject_raw, 0.0, 1.0))

    # 4. Specialized Utility (Uspecialized) - 15 points
    # Avoidable violation:
    # 1. Level-1 placed in Monitored or Critical while General free
    # 2. Level-2 placed in Critical while Monitored free
    if n_admitted > 0:
        u_specialized_raw = 1.0 - (avoidable_specialized_count / float(n_admitted))
    else:
        u_specialized_raw = 1.0
    u_specialized = float(np.clip(u_specialized_raw, 0.0, 1.0))

    # 5. Runtime / Reproducibility - 5 points
    # Max score if runtime <= 10.0 seconds and deterministic execution verified
    u_runtime = 1.0 if runtime_seconds <= 10.0 else float(np.clip(10.0 / runtime_seconds, 0.0, 1.0))

    # Final overall score out of 100 points
    overall_score = float(
        45.0 * u_wait +
        20.0 * u_critical +
        15.0 * u_reject +
        15.0 * u_specialized +
        5.0 * u_runtime
    )

    # Bed utilization statistics
    total_bed_capacity = sum(bed_capacities.values())
    horizon = max(sim_end_time, max([p.departure_time or 0.0 for p in patients]))
    if horizon > 0:
        general_stay_sum = sum(p.actual_los for p in admitted_patients if p.assigned_bed_type == "General")
        monitored_stay_sum = sum(p.actual_los for p in admitted_patients if p.assigned_bed_type == "Monitored")
        critical_stay_sum = sum(p.actual_los for p in admitted_patients if p.assigned_bed_type == "Critical")
        total_stay_sum = general_stay_sum + monitored_stay_sum + critical_stay_sum

        gen_util = float(general_stay_sum / (bed_capacities["General"] * horizon))
        mon_util = float(monitored_stay_sum / (bed_capacities["Monitored"] * horizon))
        crit_util = float(critical_stay_sum / (bed_capacities["Critical"] * horizon))
        total_util = float(total_stay_sum / (total_bed_capacity * horizon))
    else:
        gen_util, mon_util, crit_util, total_util = 0.0, 0.0, 0.0, 0.0

    return {
        "Uwait": round(u_wait, 6),
        "Ucritical": round(u_critical, 6),
        "Ureject": round(u_reject, 6),
        "Uspecialized": round(u_specialized, 6),
        "overall_score": round(overall_score, 4),
        "weighted_wait": round(float(sum_weighted_capped_wait), 2),
        "critical_wait": round(float(critical_avg_wait), 2),
        "number_admitted": int(n_admitted),
        "number_rejected": int(n_rejected),
        "number_waiting_at_end": int(n_waiting_at_end),
        "average_wait": round(float(np.mean(raw_waits)), 2),
        "median_wait": round(float(np.median(raw_waits)), 2),
        "p95_wait": round(float(np.percentile(raw_waits, 95)), 2),
        "max_wait": round(float(np.max(raw_waits)), 2),
        "general_bed_utilization": round(gen_util, 4),
        "monitored_bed_utilization": round(mon_util, 4),
        "critical_bed_utilization": round(crit_util, 4),
        "total_bed_utilization": round(total_util, 4),
        "avoidable_specialized_assignments": int(avoidable_specialized_count),
        "runtime_seconds": round(float(runtime_seconds), 4),
        "seed": int(seed),
        "number_of_patients": int(n_patients)
    }
