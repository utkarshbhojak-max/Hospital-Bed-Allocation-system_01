# HC-03 Dashboard

This directory contains the interactive Streamlit dashboard for visual evaluation of the HC-03 hospital bed allocation simulation.

## How to Run

```bash
# From project root
streamlit run dashboard/app.py

# Or from HC-03 directory
cd HC-03
streamlit run dashboard/app.py
```

The dashboard will open in your browser (default port 8501) and displays:
- Benchmark KPIs and composite score
- Real-time bed occupancy time-series with capacity reference lines
- Waiting-time distributions and acuity breakdown
- Head-to-head policy comparison (FIFO, Acuity First, Weighted Wait, Specialized Preserving, Final Hybrid)
- Specialized bed preservation audit (zero avoidable violations)
- Granular patient decision timeline explorer
- Online policy architectural flow diagram
