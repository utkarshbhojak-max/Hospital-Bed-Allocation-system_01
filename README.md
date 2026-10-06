# HC-03 — Hospital Bed Allocation Under Capacity Constraints

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-2ea44f?style=for-the-badge&logo=google-chrome&logoColor=white)](https://ais-pre-bxsd6phb2xtv72xk2ruezk-939759036256.asia-east1.run.app)
[![Open in GitHub Codespaces](https://img.shields.io/badge/Open%20in-GitHub%20Codespaces-1f2328?style=for-the-badge&logo=github&logoColor=white)](https://codespaces.new/utkarshbhojak-max/Hospital-bed-allocation-system)
[![TypeScript](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Tailwind-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://ais-pre-bxsd6phb2xtv72xk2ruezk-939759036256.asia-east1.run.app)
[![Python](https://img.shields.io/badge/Kernel-Python%20Simulation-3776ab?style=for-the-badge&logo=python&logoColor=white)](https://github.com/utkarshbhojak-max/Hospital-bed-allocation-system)

> 🔗 **Interactive Live Application:** [https://ais-pre-bxsd6phb2xtv72xk2ruezk-939759036256.asia-east1.run.app](https://ais-pre-bxsd6phb2xtv72xk2ruezk-939759036256.asia-east1.run.app)
> Click the link above to test the live hospital bed allocation dashboard, step-by-step patient lifecycle simulator, and real-time ward heatmaps in your browser.

An online, capacity-aware hospital bed-allocation policy and discrete-event simulation engine built for the **HC-03 Healthcare Optimization Challenge**.

---

## 2-Minute Judge Demo

To immediately evaluate and verify this submission:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run official benchmark simulation and baseline comparisons
python run_experiment.py

# 3. Execute the 12-point automated verification suite
python validate.py

# 4. Launch interactive visual dashboard
streamlit run dashboard/app.py
```

---

## Executive Summary & Official Benchmark Results

Evaluated on official seed `20260911` with 500 patient arrivals:

| Metric | Baseline: FIFO | Baseline: Acuity First | Baseline: Weighted Wait | Baseline: Spec Preserving | **HC-03 Final Hybrid** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Overall Score (100 pts)** | 50.67 | 51.52 | 51.52 | 52.91 | **52.91** |
| **$U_{\text{wait}}$ (45 pts)** | 0.3435 | 0.3522 | 0.3522 | 0.3597 | **0.3597** |
| **$U_{\text{critical}}$ (20 pts)** | 0.1291 | 0.1551 | 0.1551 | 0.2094 | **0.2094** |
| **$U_{\text{reject}}$ (15 pts)** | 0.8420 | 0.8380 | 0.8380 | 0.8360 | **0.8360** |
| **$U_{\text{specialized}}$ (15 pts)** | 1.0000 | 1.0000 | 1.0000 | 1.0000 | **1.0000** |
| **Admitted / Rejected** | 421 / 79 | 419 / 81 | 419 / 81 | 418 / 82 | **418 / 82** |
| **Avoidable Violations** | 0 | 0 | 0 | 0 | **0 (Zero Defect)** |
| **General Bed Util** | 80.8% | 80.4% | 80.4% | 80.2% | **80.2%** |
| **Monitored Bed Util** | 92.8% | 92.3% | 92.3% | 92.1% | **92.1%** |
| **Critical Bed Util** | 92.4% | 92.0% | 92.0% | 91.7% | **91.7%** |
| **Runtime** | 0.09 s | 0.09 s | 0.09 s | 0.09 s | **0.10 s** |

---

## Core Problem & Capacity Bottleneck Analysis

A hospital operates **45 physical beds** across three distinct care tiers:
- **General (30 beds):** Accommodates Level 1 patients (60% arrivals, median LOS = 120 min).
- **Monitored (10 beds):** Accommodates Level 2 and Level 1 patients (30% arrivals, median LOS = 180 min).
- **Critical (5 beds):** Accommodates Level 3, Level 2, and Level 1 patients (10% arrivals, median LOS = 240 min).

### The Specialized Capacity Bottleneck
In the 500-patient cohort:
- **Level 3 demand:** 56 critical arrivals $\times$ 240 min median LOS $\approx$ **13,934 bed-minutes**.
- **Critical supply:** 5 beds $\times$ 1,228 min simulation horizon $=$ **6,140 bed-minutes**.

**Mathematical Insight:** Critical beds are in **2.27$\times$ overload purely from Level 3 patients**. 
If lower-acuity patients (Level 1 or 2) are permitted to occupy Critical beds (as occurs in unconstrained FIFO), subsequent Level 3 arrivals find zero beds, wait past the 240-minute limit, and are rejected. Because Level 3 carries an acuity weight of 8 and a dedicated 20-point metric ($U_{\text{critical}}$), starving Critical beds causes severe metric degradation.

The **Final Hybrid Policy** actively reserves Critical beds for Level 3, strictly preventing avoidable cross-acuity spillover while keeping overall hospital bed utilization above 84%.

---

## Online Policy Design & Formulation

The policy strictly adheres to an **online operational model**:
- Receives only **immutable observation objects** of patients currently in the waiting queue.
- **NEVER** accesses future arrival times, future realized LOS, RNG state, or the internal simulator event queue.
- Makes decisions solely from current clock time, current occupancy, and published distributions.

### Urgency & Dynamic Aging Function
For each waiting patient $i$ with acuity $a_i \in \{1, 2, 3\}$, waiting weight $w_i \in \{1, 3, 8\}$, and elapsed wait $t_{\text{wait}} = t - t_{\text{arr}}$:

$$\text{Urgency}(t_{\text{wait}}) = \left(\frac{t_{\text{wait}}}{240}\right)^{1.6} \times 120 + \Delta_{\text{aging}}(t_{\text{wait}})$$

where the non-linear aging spike prevents 240-minute timeout rejections:
$$\Delta_{\text{aging}}(t_{\text{wait}}) = \begin{cases}
\left(\frac{t_{\text{wait}} - 180}{30}\right)^2 \times 150 + 400 & \text{if } t_{\text{wait}} \ge 215 \\
\left(\frac{t_{\text{wait}} - 180}{30}\right)^2 \times 150 & \text{if } 180 \le t_{\text{wait}} < 215 \\
0 & \text{otherwise}
\end{cases}$$

### Priority Scoring & Bed Governance
1. **Level 3 Patients:** Must use Critical beds only. Priority receives a $3.5\times$ multiplier $+ 800.0$ boost.
2. **Level 2 Patients:** Prefer Monitored beds. Escalation to Critical is strictly governed: permitted only when Monitored is full, zero Level 3 patients are waiting, and either $t_{\text{wait}} \ge 200$ min or a $\ge 2$ bed Critical buffer exists.
3. **Level 1 Patients:** Prefer General beds. Escalation to Monitored is permitted only when General is full, zero Level 2 patients are waiting, and $t_{\text{wait}} \ge 200$ min.
4. **Zero-Avoidable-Violation Invariant:**
   - Level 1 is **never** assigned to Monitored or Critical if General has $\ge 1$ free bed.
   - Level 2 is **never** assigned to Critical if Monitored has $\ge 1$ free bed.

---

## Automated Verification Suite (`validate.py`)

All 12 challenge constraints are programmatically verified:
1. **Cohort Size:** Exactly 500 patients generated via NumPy PCG64 (seed 20260911).
2. **Capacity Bounds:** Zero over-capacity at any time ($G \le 30, M \le 10, C \le 5$).
3. **No Duplicate Admissions:** Unique patient IDs only.
4. **No Duplicate Rejections:** Unique patient IDs only.
5. **Terminal State Exclusivity:** Admitted $\cap$ Rejected $= \emptyset$.
6. **Level 3 Compliance:** Never assigned General or Monitored beds.
7. **Level 2 Compliance:** Never assigned General beds.
8. **No Evictions:** Admitted patients stay for their exact realized LOS ($t_{\text{dep}} - t_{\text{adm}} = \text{actual\_los}$).
9. **No Premature Rejections:** All rejections occur strictly at $t_{\text{wait}} = 240.0$ minutes.
10. **Completeness:** All 500 patients resolve into a terminal state (418 Admitted, 82 Rejected, 0 Waiting).
11. **Anti-Future-Information Invariance:** Policy output is mathematically invariant to hidden future events.
12. **Deterministic Reproducibility:** Repeated execution yields bit-for-bit identical outputs.

---

## File Structure

```text
HC-03/
├── README.md                  # Project documentation & 2-minute judge walkthrough
├── requirements.txt           # Python dependencies (numpy, pandas, streamlit, plotly)
├── policy.py                  # Final online hybrid allocation policy
├── simulator.py               # Discrete-event simulation engine (min-heap queue)
├── patient_generator.py       # NumPy PCG64 synthetic cohort generator
├── metrics.py                 # HC-03 utility scoring & benchmark calculations
├── baselines.py               # FIFO, Acuity-First, Weighted-Wait, Spec-Preserving
├── run_experiment.py          # Benchmark runner & artifact generator
├── validate.py                # 12-point automated validation test suite
│
├── output/                    # Official benchmark outputs
│   ├── decisions.csv          # Decision-by-decision log with human reasons
│   ├── occupancy.csv          # Instantaneous bed occupancy time-series
│   ├── patients.csv           # 500-patient final terminal state log
│   ├── metrics.json           # Detailed benchmark metrics & scoring
│   ├── policy_comparison.csv  # Baseline comparative analysis
│   └── validation_report.json # Automated test results
│
└── dashboard/
    ├── app.py                 # Interactive Streamlit dashboard
    └── README.md              # Dashboard launch instructions
```

---

## Output Files Specification

1. **`output/decisions.csv`** (949 events):
   Columns: `patient_id`, `arrival_time`, `acuity`, `decision_time`, `decision`, `bed_type`, `waiting_time`, `priority_score`, `reason`, `admission_time`, `departure_time`, `length_of_stay`.
2. **`output/occupancy.csv`** (837 timestamps):
   Tracks instantaneous occupancy across all three care units with physical capacity reference lines.
3. **`output/patients.csv`** (500 records):
   Complete roster of all 500 patients with realized LOS, assigned bed, and terminal outcome.
4. **`output/metrics.json`**:
   Full JSON payload containing $U_{\text{wait}}, U_{\text{critical}}, U_{\text{reject}}, U_{\text{specialized}}$, bed utilizations, and composite score.
5. **`output/policy_comparison.csv`**:
   Head-to-head metrics comparing all 5 evaluated policies.
6. **`output/validation_report.json`**:
   Machine-readable audit report of all 12 validation assertions.
