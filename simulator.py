"""
HC-03 Hospital Bed Allocation - Discrete-Event Simulator
=========================================================
Implements an event-driven discrete-event simulation engine for hospital bed allocation.

Deterministic Event Ordering:
1. DEPARTURE (Priority 1): Discharges completed stays and frees bed capacity before new arrivals.
2. ARRIVAL (Priority 2): Registers incoming patients and queues them for allocation.
3. REJECTION_CHECK (Priority 3): Enforces the strict 240-minute waiting timeout.
4. ALLOCATION (Iterative): Dispatches online policy decisions while compatible capacity remains.

Information Boundary Enforcement:
- Never passes future events, future arrivals, future realized LOS, or RNG state to policies.
- Feeds policies with immutable PatientObservation objects only.
"""

import heapq
import time
from typing import List, Dict, Tuple, Optional, Any
import numpy as np

from patient_generator import (
    BED_CAPACITIES,
    BED_COMPATIBILITY,
    PREFERRED_BED,
    ACUITY_WAITING_WEIGHTS,
    REJECTION_THRESHOLD,
    Patient,
    PatientObservation,
    generate_patients
)
from metrics import calculate_metrics


class DiscreteEventSimulator:
    """
    Hospital bed allocation discrete-event simulator with strict online boundary.
    """

    def __init__(
        self,
        policy: Any,
        capacities: Optional[Dict[str, int]] = None,
        seed: int = 20260911,
        n_patients: int = 500
    ):
        self.policy = policy
        self.capacities = capacities or BED_CAPACITIES.copy()
        self.seed = seed
        self.n_patients = n_patients

        # State variables
        self.current_time = 0.0
        self.occupancy = {k: 0 for k in self.capacities}
        self.waiting_queue: List[int] = []  # List of patient_ids in waiting room
        self.patient_map: Dict[int, Patient] = {}
        self.event_heap: List[Tuple[float, int, int, str, int]] = []

        # Tracking logs
        self.decision_records: List[Dict[str, Any]] = []
        self.occupancy_records: List[Dict[str, Any]] = []
        self.recent_events: List[Dict[str, Any]] = []
        self.latest_decision: Optional[Dict[str, Any]] = None
        self.avoidable_violations = 0
        self.event_counter = 0

        # Counters
        self.patients_arrived_count = 0
        self.patients_admitted_count = 0
        self.patients_rejected_count = 0
        self.is_finished = False

        self.reset()

    def _log_occupancy(self):
        """Record instantaneous bed occupancy."""
        gen_occ = self.occupancy["General"]
        mon_occ = self.occupancy["Monitored"]
        crit_occ = self.occupancy["Critical"]
        total_occ = gen_occ + mon_occ + crit_occ
        total_cap = sum(self.capacities.values())

        self.occupancy_records.append({
            "time": round(self.current_time, 4),
            "general_occupied": gen_occ,
            "general_capacity": self.capacities["General"],
            "monitored_occupied": mon_occ,
            "monitored_capacity": self.capacities["Monitored"],
            "critical_occupied": crit_occ,
            "critical_capacity": self.capacities["Critical"],
            "total_occupied": total_occ,
            "total_capacity": total_cap
        })

    def _create_observation(self, p: Patient) -> PatientObservation:
        """Create an immutable, online-safe observation for a waiting patient."""
        elapsed = self.current_time - p.arrival_time
        return PatientObservation(
            patient_id=p.patient_id,
            arrival_time=p.arrival_time,
            acuity=p.acuity,
            arrival_order=p.arrival_order,
            elapsed_wait=round(elapsed, 4),
            waiting_weight=ACUITY_WAITING_WEIGHTS[p.acuity],
            preferred_bed=PREFERRED_BED[p.acuity],
            compatible_beds=tuple(BED_COMPATIBILITY[p.acuity])
        )

    def reset(self):
        """
        Reset simulation state and re-initialize with exact challenge seed cohort.
        """
        self.current_time = 0.0
        self.occupancy = {k: 0 for k in self.capacities}
        self.waiting_queue = []
        self.decision_records = []
        self.occupancy_records = []
        self.recent_events = []
        self.latest_decision = None
        self.avoidable_violations = 0
        self.event_counter = 0

        self.patients_arrived_count = 0
        self.patients_admitted_count = 0
        self.patients_rejected_count = 0
        self.is_finished = False

        # Generate synthetic cohort
        patients = generate_patients(seed=self.seed, n_patients=self.n_patients)
        self.patient_map = {p.patient_id: p for p in patients}

        # Event Priority Queue (min-heap)
        # Tuples: (time, priority_tier, event_id, event_type, patient_id)
        self.event_heap = []
        for p in patients:
            heapq.heappush(self.event_heap, (p.arrival_time, 2, self.event_counter, "ARRIVAL", p.patient_id))
            self.event_counter += 1
            heapq.heappush(
                self.event_heap,
                (p.arrival_time + REJECTION_THRESHOLD, 3, self.event_counter, "REJECTION_CHECK", p.patient_id)
            )
            self.event_counter += 1

        self._log_occupancy()
        self.recent_events.append({
            "time": 0.0,
            "type": "SIM_INIT",
            "title": "SYSTEM INITIALIZED",
            "patient_id": None,
            "desc": f"Hospital opened (General: {self.capacities['General']}, Monitored: {self.capacities['Monitored']}, Critical: {self.capacities['Critical']}). Cohort: {self.n_patients} patients."
        })

    def step(self) -> Dict[str, Any]:
        """
        Process exactly the next discrete event and return current observable state.
        Never reveals future information to the policy.
        """
        if self.is_finished or not self.event_heap:
            self.is_finished = True
            return self.get_state(event_type="COMPLETED")

        ev_time, ev_tier, _, ev_type, pid = heapq.heappop(self.event_heap)
        self.current_time = ev_time
        patient = self.patient_map[pid]

        if ev_type == "DEPARTURE":
            bed = patient.assigned_bed_type
            if bed:
                self.occupancy[bed] = max(0, self.occupancy[bed] - 1)
            self._log_occupancy()
            self.recent_events.append({
                "time": round(self.current_time, 1),
                "type": "DEPARTURE",
                "title": f"DEPARTURE: Patient #{pid:03d}",
                "patient_id": pid,
                "desc": f"Patient #{pid:03d} (Acuity {patient.acuity}) completed LOS {patient.actual_los:.1f}m. {bed} bed released."
            })
            # Re-allocation cycle triggered by capacity release
            self._run_allocation_cycle(self.event_heap, trigger_ev="DEPARTURE")

        elif ev_type == "ARRIVAL":
            self.patients_arrived_count += 1
            self.waiting_queue.append(pid)
            self.recent_events.append({
                "time": round(self.current_time, 1),
                "type": "ARRIVAL",
                "title": f"ARRIVAL: Patient #{pid:03d}",
                "patient_id": pid,
                "desc": f"Patient #{pid:03d} arrived (Acuity Level {patient.acuity}, Preferred: {PREFERRED_BED[patient.acuity]})."
            })
            # Attempt immediate allocation
            assigned = self._run_allocation_cycle(self.event_heap, trigger_ev="ARRIVAL")
            if not assigned and pid in self.waiting_queue:
                self.decision_records.append({
                    "patient_id": patient.patient_id,
                    "arrival_time": round(patient.arrival_time, 4),
                    "acuity": patient.acuity,
                    "decision_time": round(self.current_time, 4),
                    "decision": "WAITING",
                    "bed_type": "NONE",
                    "waiting_time": 0.0,
                    "priority_score": 0.0,
                    "reason": "Compatible capacity currently occupied; placed in waiting queue",
                    "admission_time": None,
                    "departure_time": None,
                    "length_of_stay": round(patient.actual_los, 4)
                })
                self.latest_decision = {
                    "patient_id": patient.patient_id,
                    "acuity": patient.acuity,
                    "waiting_time": 0.0,
                    "decision": "QUEUE → WAITING",
                    "bed_type": "NONE",
                    "reason": "Compatible beds occupied or reserved; patient held in waiting room",
                    "priority_score": 0.0,
                    "decision_time": round(self.current_time, 1)
                }

        elif ev_type == "REJECTION_CHECK":
            if patient.terminal_status is None:
                # Patient timed out after 240 minutes
                patient.terminal_status = "REJECTED"
                patient.waiting_time = REJECTION_THRESHOLD
                self.patients_rejected_count += 1
                if pid in self.waiting_queue:
                    self.waiting_queue.remove(pid)

                self.decision_records.append({
                    "patient_id": patient.patient_id,
                    "arrival_time": round(patient.arrival_time, 4),
                    "acuity": patient.acuity,
                    "decision_time": round(self.current_time, 4),
                    "decision": "REJECTED",
                    "bed_type": "NONE",
                    "waiting_time": REJECTION_THRESHOLD,
                    "priority_score": 0.0,
                    "reason": "Rejected after 240-minute waiting threshold",
                    "admission_time": None,
                    "departure_time": None,
                    "length_of_stay": round(patient.actual_los, 4)
                })
                self.latest_decision = {
                    "patient_id": patient.patient_id,
                    "acuity": patient.acuity,
                    "waiting_time": REJECTION_THRESHOLD,
                    "decision": "REJECTED (TIMEOUT)",
                    "bed_type": "NONE",
                    "reason": "Exceeded 240-minute hard waiting limit under continuous capacity saturation",
                    "priority_score": 0.0,
                    "decision_time": round(self.current_time, 1)
                }
                self.recent_events.append({
                    "time": round(self.current_time, 1),
                    "type": "REJECTION",
                    "title": f"TIMEOUT: Patient #{pid:03d}",
                    "patient_id": pid,
                    "desc": f"Patient #{pid:03d} (Acuity {patient.acuity}) reached 240.0 min timeout without available bed."
                })

        if not self.event_heap:
            self.is_finished = True

        return self.get_state(event_type=ev_type, pid=pid)

    def calculate_current_metrics(self) -> Dict[str, Any]:
        """Calculate progressive metrics based strictly on observable history."""
        if self.is_finished:
            final_m = calculate_metrics(
                patients=list(self.patient_map.values()),
                avoidable_specialized_count=self.avoidable_violations,
                bed_capacities=self.capacities,
                runtime_seconds=0.0,
                seed=self.seed,
                sim_end_time=self.current_time
            )
            final_m["composite_score"] = final_m["overall_score"]
            final_m["admitted_count"] = final_m["number_admitted"]
            final_m["rejected_count"] = final_m["number_rejected"]
            final_m["waiting_count"] = final_m["number_waiting_at_end"]
            final_m["avg_waiting_time"] = final_m["average_wait"]
            final_m["p95_waiting_time"] = final_m["p95_wait"]
            return final_m

        arrived_pts = [p for p in self.patient_map.values() if p.arrival_time <= self.current_time]
        if not arrived_pts:
            return {
                "Uwait": 1.0,
                "Ucritical": 1.0,
                "Ureject": 1.0,
                "Uspecialized": 1.0,
                "overall_score": 100.0,
                "composite_score": 100.0,
                "average_wait": 0.0,
                "avg_waiting_time": 0.0,
                "p95_wait": 0.0,
                "p95_waiting_time": 0.0,
                "number_admitted": 0,
                "admitted_count": 0,
                "number_rejected": 0,
                "rejected_count": 0,
                "number_waiting_at_end": 0,
                "waiting_count": 0,
                "avoidable_specialized_assignments": 0
            }

        current_waits = []
        for p in arrived_pts:
            if p.terminal_status is not None:
                current_waits.append(p.waiting_time)
            else:
                current_waits.append(self.current_time - p.arrival_time)

        capped_waits = [min(w, REJECTION_THRESHOLD) for w in current_waits]
        sum_w = sum(ACUITY_WAITING_WEIGHTS[p.acuity] for p in arrived_pts)
        sum_weighted = sum(
            ACUITY_WAITING_WEIGHTS[p.acuity] * cw
            for p, cw in zip(arrived_pts, capped_waits)
        )
        u_wait = float(np.clip(1.0 - (sum_weighted / (240.0 * sum_w)), 0.0, 1.0)) if sum_w > 0 else 1.0

        crit_pts = [(p, w) for p, w in zip(arrived_pts, current_waits) if p.acuity == 3]
        if crit_pts:
            crit_capped = [min(w, REJECTION_THRESHOLD) for _, w in crit_pts]
            u_critical = float(np.clip(1.0 - (sum(crit_capped) / (240.0 * len(crit_pts))), 0.0, 1.0))
        else:
            u_critical = 1.0

        n_arrived = len(arrived_pts)
        u_reject = float(np.clip(1.0 - (self.patients_rejected_count / n_arrived), 0.0, 1.0))
        u_spec = float(np.clip(1.0 - (self.avoidable_violations / 15.0), 0.0, 1.0))
        composite = (45.0 * u_wait) + (20.0 * u_critical) + (15.0 * u_reject) + (15.0 * u_spec) + 5.0

        return {
            "Uwait": round(u_wait, 4),
            "Ucritical": round(u_critical, 4),
            "Ureject": round(u_reject, 4),
            "Uspecialized": round(u_spec, 4),
            "overall_score": round(composite, 2),
            "composite_score": round(composite, 2),
            "average_wait": round(float(np.mean(current_waits)), 1) if current_waits else 0.0,
            "avg_waiting_time": round(float(np.mean(current_waits)), 1) if current_waits else 0.0,
            "p95_wait": round(float(np.percentile(current_waits, 95)), 1) if current_waits else 0.0,
            "p95_waiting_time": round(float(np.percentile(current_waits, 95)), 1) if current_waits else 0.0,
            "number_admitted": self.patients_admitted_count,
            "admitted_count": self.patients_admitted_count,
            "number_rejected": self.patients_rejected_count,
            "rejected_count": self.patients_rejected_count,
            "number_waiting_at_end": len(self.waiting_queue),
            "waiting_count": len(self.waiting_queue),
            "avoidable_specialized_assignments": self.avoidable_violations
        }

    def get_state(self, event_type: str = "", pid: Optional[int] = None) -> Dict[str, Any]:
        """Produce the observable simulation state for the live UI."""
        waiting_info = []
        for wpid in self.waiting_queue:
            p = self.patient_map[wpid]
            elapsed = round(self.current_time - p.arrival_time, 1)
            w = ACUITY_WAITING_WEIGHTS[p.acuity]
            # Simple priority score = weight * wait
            p_score = round(w * elapsed, 1)
            time_left = max(0.0, round(REJECTION_THRESHOLD - elapsed, 1))
            waiting_info.append({
                "patient_id": f"#{p.patient_id:03d}",
                "acuity": f"Level {p.acuity}",
                "acuity_raw": p.acuity,
                "wait": f"{elapsed:.1f} min",
                "wait_raw": elapsed,
                "weight": f"{w:.1f}x",
                "compatible_beds": "/".join(BED_COMPATIBILITY[p.acuity]),
                "preferred_bed": PREFERRED_BED[p.acuity],
                "priority": p_score,
                "status": "WAITING",
                "location": "ED Holding Lounge",
                "time_to_timeout": time_left,
                "timeout_threshold": REJECTION_THRESHOLD,
                "shift_target": f"Shift to {PREFERRED_BED[p.acuity]} on departure" if time_left > 0 else "Shift to Regional Hospital Network"
            })
        waiting_info.sort(key=lambda x: x["priority"], reverse=True)

        metrics = self.calculate_current_metrics()

        return {
            "simulation_time": round(self.current_time, 1),
            "event_type": event_type,
            "patient_id": pid,
            "acuity": self.patient_map[pid].acuity if pid is not None and pid in self.patient_map else None,
            "waiting_patients": waiting_info,
            "occupancy": self.occupancy.copy(),
            "capacities": self.capacities.copy(),
            "recent_events": list(self.recent_events[-25:]),
            "latest_decision": self.latest_decision,
            "metrics": metrics,
            "patients_arrived": self.patients_arrived_count,
            "patients_waiting": len(self.waiting_queue),
            "patients_admitted": self.patients_admitted_count,
            "patients_rejected": self.patients_rejected_count,
            "avoidable_violations": self.avoidable_violations,
            "is_finished": self.is_finished,
            "occupancy_records": self.occupancy_records
        }

    def run(self) -> Dict[str, Any]:
        """
        Execute full simulation until all patients resolve into terminal states.
        """
        start_cpu = time.perf_counter()
        self.reset()
        while not self.is_finished:
            self.step()
        runtime_sec = time.perf_counter() - start_cpu

        metrics = calculate_metrics(
            patients=list(self.patient_map.values()),
            avoidable_specialized_count=self.avoidable_violations,
            bed_capacities=self.capacities,
            runtime_seconds=runtime_sec,
            seed=self.seed,
            sim_end_time=self.current_time
        )

        return {
            "metrics": metrics,
            "patients": list(self.patient_map.values()),
            "decisions": self.decision_records,
            "occupancy": self.occupancy_records,
            "avoidable_violations": self.avoidable_violations
        }

    def _run_allocation_cycle(
        self,
        event_heap: List[Tuple[float, int, int, str, int]],
        trigger_ev: str = "ARRIVAL"
    ) -> bool:
        """
        Continually invoke online policy to match waiting patients with free beds.
        Returns True if at least one patient was admitted during this cycle.
        """
        any_assigned = False

        while True:
            free_caps = {k: self.capacities[k] - self.occupancy[k] for k in self.capacities}
            if sum(free_caps.values()) <= 0 or not self.waiting_queue:
                break

            # Build strictly immutable, online-safe observation objects
            observations = [
                self._create_observation(self.patient_map[wpid])
                for wpid in self.waiting_queue
            ]

            # Query online policy
            decision = self.policy.decide(
                waiting_patients=observations,
                current_occupancy=self.occupancy.copy(),
                current_time=self.current_time
            )

            if decision is None:
                # Policy strategically chooses to hold back capacity
                break

            chosen_pid, chosen_bed, priority_score, reason = decision
            if chosen_pid not in self.waiting_queue:
                break

            patient = self.patient_map[chosen_pid]

            # Validate bed feasibility
            if chosen_bed not in BED_COMPATIBILITY[patient.acuity]:
                raise ValueError(
                    f"Policy violated compatibility: Acuity {patient.acuity} cannot occupy {chosen_bed}!"
                )

            if self.occupancy[chosen_bed] >= self.capacities[chosen_bed]:
                raise ValueError(
                    f"Policy attempted assignment to full bed capacity: {chosen_bed} is full!"
                )

            # Audit avoidable specialized violations
            # 1. Level-1 placed in Monitored or Critical while General free
            if patient.acuity == 1 and chosen_bed in ("Monitored", "Critical") and free_caps["General"] > 0:
                self.avoidable_violations += 1
            # 2. Level-2 placed in Critical while Monitored free
            elif patient.acuity == 2 and chosen_bed == "Critical" and free_caps["Monitored"] > 0:
                self.avoidable_violations += 1

            # Commit admission
            self.occupancy[chosen_bed] += 1
            patient.assigned_bed_type = chosen_bed
            patient.admission_time = self.current_time
            patient.waiting_time = self.current_time - patient.arrival_time
            patient.departure_time = self.current_time + patient.actual_los
            patient.terminal_status = "ADMITTED"
            self.patients_admitted_count += 1
            self.waiting_queue.remove(chosen_pid)

            # Schedule departure event
            heapq.heappush(
                event_heap,
                (patient.departure_time, 1, self.event_counter, "DEPARTURE", patient.patient_id)
            )
            self.event_counter += 1

            # Log ADMITTED decision
            self.decision_records.append({
                "patient_id": patient.patient_id,
                "arrival_time": round(patient.arrival_time, 4),
                "acuity": patient.acuity,
                "decision_time": round(self.current_time, 4),
                "decision": "ADMITTED",
                "bed_type": chosen_bed,
                "waiting_time": round(patient.waiting_time, 4),
                "priority_score": priority_score,
                "reason": reason,
                "admission_time": round(patient.admission_time, 4),
                "departure_time": round(patient.departure_time, 4),
                "length_of_stay": round(patient.actual_los, 4)
            })

            # Update latest decision and recent events
            action_type = "RE-ALLOCATION" if trigger_ev == "DEPARTURE" else "ADMISSION"
            self.latest_decision = {
                "patient_id": patient.patient_id,
                "acuity": patient.acuity,
                "waiting_time": round(patient.waiting_time, 1),
                "decision": f"ADMIT → {chosen_bed.upper()}",
                "bed_type": chosen_bed,
                "reason": reason,
                "priority_score": round(priority_score, 2),
                "decision_time": round(self.current_time, 1)
            }
            self.recent_events.append({
                "time": round(self.current_time, 1),
                "type": action_type,
                "title": f"{action_type}: Patient #{chosen_pid:03d} → {chosen_bed}",
                "patient_id": chosen_pid,
                "desc": f"Patient #{chosen_pid:03d} (Acuity {patient.acuity}) admitted to {chosen_bed}. Wait: {patient.waiting_time:.1f}m. Reason: {reason}"
            })

            self._log_occupancy()
            any_assigned = True

        return any_assigned
