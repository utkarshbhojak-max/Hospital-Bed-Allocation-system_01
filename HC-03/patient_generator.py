"""
HC-03 Hospital Bed Allocation - Patient Generator Module
=========================================================
Generates synthetic patient cohort strictly adhering to challenge specifications:
- NumPy PCG64 explicit bit generator with seed 20260911
- Exactly 500 patient arrivals
- Inter-arrival times: Exponential distribution (mean = 2.5 min)
- Acuity probabilities: Level 1 = 0.60, Level 2 = 0.30, Level 3 = 0.10
- Length of Stay (LOS): Lognormal (sigma = 0.35)
  - General (Level 1): Median = 120 min (mu = ln(120))
  - Monitored (Level 2): Median = 180 min (mu = ln(180))
  - Critical (Level 3): Median = 240 min (mu = ln(240))
"""

from dataclasses import dataclass
from typing import List, Optional
import numpy as np

# Published distribution parameters
MEAN_INTER_ARRIVAL = 2.5
ACUITY_LEVELS = [1, 2, 3]
ACUITY_PROBABILITIES = [0.60, 0.30, 0.10]
LOS_SIGMA = 0.35

MEDIAN_LOS = {
    1: 120.0,  # Level 1 preferred General: 120 min
    2: 180.0,  # Level 2 preferred Monitored: 180 min
    3: 240.0   # Level 3 preferred Critical: 240 min
}

ACUITY_WAITING_WEIGHTS = {
    1: 1.0,
    2: 3.0,
    3: 8.0
}

BED_CAPACITIES = {
    "General": 30,
    "Monitored": 10,
    "Critical": 5
}

BED_COMPATIBILITY = {
    1: ["General", "Monitored", "Critical"],
    2: ["Monitored", "Critical"],
    3: ["Critical"]
}

PREFERRED_BED = {
    1: "General",
    2: "Monitored",
    3: "Critical"
}

REJECTION_THRESHOLD = 240.0


@dataclass
class Patient:
    """Internal simulator patient record."""
    patient_id: int
    arrival_time: float
    acuity: int
    arrival_order: int
    actual_los: float
    admission_time: Optional[float] = None
    departure_time: Optional[float] = None
    assigned_bed_type: Optional[str] = None
    waiting_time: Optional[float] = None
    terminal_status: Optional[str] = None  # "ADMITTED" or "REJECTED"


@dataclass(frozen=True)
class PatientObservation:
    """
    Immutable observation object provided to online allocation policies.
    Guarantees that the policy NEVER accesses future realized LOS,
    simulator internal state, or future events.
    """
    patient_id: int
    arrival_time: float
    acuity: int
    arrival_order: int
    elapsed_wait: float
    waiting_weight: float
    preferred_bed: str
    compatible_beds: tuple


def generate_patients(seed: int = 20260911, n_patients: int = 500) -> List[Patient]:
    """
    Generate synthetic patient cohort using NumPy PCG64.
    
    Sequential sampling per patient:
    For each arriving patient, draws:
      1. Inter-arrival time ~ Exp(mean=2.5)
      2. Acuity ~ Categorical([1,2,3], p=[0.60, 0.30, 0.10])
      3. Realized LOS ~ Lognormal(mu=ln(median), sigma=0.35)
    """
    rng = np.random.Generator(np.random.PCG64(seed))
    patients: List[Patient] = []
    current_time = 0.0

    for i in range(n_patients):
        iat = float(rng.exponential(scale=MEAN_INTER_ARRIVAL))
        current_time += iat
        
        acuity = int(rng.choice(ACUITY_LEVELS, p=ACUITY_PROBABILITIES))
        median = MEDIAN_LOS[acuity]
        mu = float(np.log(median))
        los = float(rng.lognormal(mean=mu, sigma=LOS_SIGMA))
        
        patient = Patient(
            patient_id=i + 1,
            arrival_time=round(current_time, 6),
            acuity=acuity,
            arrival_order=i,
            actual_los=round(los, 6)
        )
        patients.append(patient)

    return patients
