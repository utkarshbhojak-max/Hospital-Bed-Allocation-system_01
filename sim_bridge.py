"""
sim_bridge.py — Lightweight JSON-RPC bridge for the HC-03 Discrete Event Simulator.
Reads line-delimited JSON commands from stdin and outputs line-delimited JSON state to stdout.
"""

import sys
import json
import traceback

from simulator import DiscreteEventSimulator
from policy import BedAllocationPolicy

def main():
    policy = BedAllocationPolicy()
    sim = DiscreteEventSimulator(policy=policy, seed=20260911, n_patients=500)
    sim.reset()

    # Flush stdout after every print
    sys.stdout.reconfigure(line_buffering=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
            cmd = req.get("cmd", "state")

            if cmd == "reset":
                sim.reset()
                state = sim.get_state(event_type="RESET")
                state["is_finished"] = sim.is_finished
                print(json.dumps({"status": "ok", "state": state}))

            elif cmd == "step":
                steps = max(1, min(100, int(req.get("steps", 1))))
                last_state = None
                for _ in range(steps):
                    if not sim.is_finished:
                        last_state = sim.step()
                    else:
                        break
                if last_state is None:
                    last_state = sim.get_state(event_type="STEP")
                last_state["is_finished"] = sim.is_finished
                print(json.dumps({"status": "ok", "state": last_state}))

            elif cmd == "state":
                state = sim.get_state()
                state["is_finished"] = sim.is_finished
                print(json.dumps({"status": "ok", "state": state}))

            else:
                print(json.dumps({"status": "error", "error": f"Unknown command: {cmd}"}))

        except Exception as e:
            err_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
            print(json.dumps({"status": "error", "error": err_msg}))

if __name__ == "__main__":
    main()
