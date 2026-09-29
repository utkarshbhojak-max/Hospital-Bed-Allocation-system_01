"""
HC-03 Hospital Bed Allocation - Benchmark Runner
=================================================
Main entry point for executing experiments, comparing against all baselines,
generating official artifacts, and running validation checks.
"""

import os
import json
import time
from typing import Dict, Any, List
import pandas as pd

from patient_generator import BED_CAPACITIES
from simulator import DiscreteEventSimulator
from policy import BedAllocationPolicy
from baselines import (
    FIFOPolicy,
    AcuityFirstPolicy,
    WeightedWaitPolicy,
    SpecializedPreservingPolicy
)
from validate import validate_simulation_run


def run_benchmark(seed: int = 20260911, n_patients: int = 500) -> Dict[str, Any]:
    print("==================================================")
    print("HC-03 HOSPITAL BED ALLOCATION SIMULATION")
    print("==================================================")
    print()
    print(f"Seed: {seed}")
    print(f"Patients: {n_patients}")
    print()

    # Define all comparative baselines + final hybrid policy
    policies = [
        ("FIFO", FIFOPolicy()),
        ("Acuity First", AcuityFirstPolicy()),
        ("Weighted Wait", WeightedWaitPolicy()),
        ("Specialized Preserving", SpecializedPreservingPolicy()),
        ("Final Hybrid Policy", BedAllocationPolicy())
    ]

    print("Running baseline policies...")
    comparison_records: List[Dict[str, Any]] = []
    final_res = None

    for name, pol in policies:
        sim = DiscreteEventSimulator(policy=pol, seed=seed, n_patients=n_patients)
        res = sim.run()
        m = res["metrics"]
        
        comparison_records.append({
            "Policy": name,
            "Overall Score": m["overall_score"],
            "Uwait": m["Uwait"],
            "Ucritical": m["Ucritical"],
            "Ureject": m["Ureject"],
            "Uspecialized": m["Uspecialized"],
            "Admitted": m["number_admitted"],
            "Rejected": m["number_rejected"],
            "Avg Wait (min)": m["average_wait"],
            "P95 Wait (min)": m["p95_wait"],
            "Avoidable Violations": m["avoidable_specialized_assignments"],
            "Runtime (s)": m["runtime_seconds"]
        })

        if name == "Final Hybrid Policy":
            final_res = res

    print("Running final hybrid policy...")
    print("Validating simulation...")

    # Run validation
    validation_report = validate_simulation_run(final_res)

    # Prepare output directories
    output_dirs = ["./output", "./HC-03/output"]
    for out_dir in output_dirs:
        os.makedirs(out_dir, exist_ok=True)

    # 1. Export decisions.csv
    df_decisions = pd.DataFrame(final_res["decisions"])
    # Ensure exact column ordering
    decision_cols = [
        "patient_id", "arrival_time", "acuity", "decision_time", "decision",
        "bed_type", "waiting_time", "priority_score", "reason",
        "admission_time", "departure_time", "length_of_stay"
    ]
    df_decisions = df_decisions[decision_cols]

    # 2. Export occupancy.csv
    df_occupancy = pd.DataFrame(final_res["occupancy"])
    occupancy_cols = [
        "time", "general_occupied", "general_capacity", "monitored_occupied",
        "monitored_capacity", "critical_occupied", "critical_capacity",
        "total_occupied", "total_capacity"
    ]
    df_occupancy = df_occupancy[occupancy_cols]

    # 3. Export patients.csv
    patient_rows = []
    for p in final_res["patients"]:
        patient_rows.append({
            "patient_id": p.patient_id,
            "arrival_time": round(p.arrival_time, 4),
            "acuity": p.acuity,
            "terminal_status": p.terminal_status,
            "admission_time": round(p.admission_time, 4) if p.admission_time is not None else "",
            "departure_time": round(p.departure_time, 4) if p.departure_time is not None else "",
            "bed_type": p.assigned_bed_type if p.assigned_bed_type is not None else "NONE",
            "actual_los": round(p.actual_los, 4),
            "waiting_time": round(p.waiting_time, 4) if p.waiting_time is not None else REJECTION_THRESHOLD
        })
    df_patients = pd.DataFrame(patient_rows)
    patient_cols = [
        "patient_id", "arrival_time", "acuity", "terminal_status",
        "admission_time", "departure_time", "bed_type", "actual_los", "waiting_time"
    ]
    df_patients = df_patients[patient_cols]

    # 4. Export policy_comparison.csv
    df_comparison = pd.DataFrame(comparison_records)

    # Write files to both output directories
    for out_dir in output_dirs:
        df_decisions.to_csv(os.path.join(out_dir, "decisions.csv"), index=False)
        df_occupancy.to_csv(os.path.join(out_dir, "occupancy.csv"), index=False)
        df_patients.to_csv(os.path.join(out_dir, "patients.csv"), index=False)
        df_comparison.to_csv(os.path.join(out_dir, "policy_comparison.csv"), index=False)

        with open(os.path.join(out_dir, "metrics.json"), "w") as f:
            json.dump(final_res["metrics"], f, indent=2)

        with open(os.path.join(out_dir, "validation_report.json"), "w") as f:
            json.dump(validation_report, f, indent=2)

    m = final_res["metrics"]
    val_status = "PASSED" if validation_report["validation_passed"] else "FAILED"

    print()
    print("---")
    print("## FINAL POLICY RESULTS")
    print()
    print(f"Uwait:                             {m['Uwait']:.4f}")
    print(f"Ucritical:                         {m['Ucritical']:.4f}")
    print(f"Ureject:                           {m['Ureject']:.4f}")
    print(f"Uspecialized:                      {m['Uspecialized']:.4f}")
    print(f"Overall Score:                     {m['overall_score']:.2f} / 100.0")
    print()
    print(f"Admitted:                          {m['number_admitted']}")
    print(f"Rejected:                          {m['number_rejected']}")
    print()
    print(f"Average Wait:                      {m['average_wait']:.2f} min")
    print(f"P95 Wait:                          {m['p95_wait']:.2f} min")
    print()
    print(f"General Utilization:               {m['general_bed_utilization'] * 100.0:.1f}%")
    print(f"Monitored Utilization:             {m['monitored_bed_utilization'] * 100.0:.1f}%")
    print(f"Critical Utilization:              {m['critical_bed_utilization'] * 100.0:.1f}%")
    print()
    print(f"Avoidable Specialized Assignments: {m['avoidable_specialized_assignments']}")
    print()
    print(f"Runtime:                           {m['runtime_seconds']:.3f} s")
    print()
    print("---")
    print(f"## VALIDATION: {val_status}")
    print()
    print("Outputs written to ./output/")
    print("==================================================")

    return {
        "final_metrics": m,
        "comparison": df_comparison,
        "validation_passed": validation_report["validation_passed"]
    }


if __name__ == "__main__":
    run_benchmark()
