import json
import traceback
from simulator import DiscreteEventSimulator
from policy import BedAllocationPolicy

class SimServer:
    def __init__(self):
        self.policy = BedAllocationPolicy()
        self.sim = DiscreteEventSimulator(policy=self.policy, seed=20260911, n_patients=500)
        self.sim.reset()

sim_instance = SimServer()

def app(environ, start_response):
    if environ['REQUEST_METHOD'] == 'POST' and environ['PATH_INFO'] == '/cmd':
        try:
            try:
                content_length = int(environ.get('CONTENT_LENGTH', 0))
            except ValueError:
                content_length = 0
                
            if content_length > 0:
                post_data = environ['wsgi.input'].read(content_length)
                req = json.loads(post_data)
            else:
                req = {}
                
            cmd = req.get("cmd", "state")
            
            if cmd == "reset":
                sim_instance.sim.reset()
                state = sim_instance.sim.get_state(event_type="RESET")
                state["is_finished"] = sim_instance.sim.is_finished
                response = {"status": "ok", "state": state}
                
            elif cmd == "step":
                steps = max(1, min(100, int(req.get("steps", 1))))
                last_state = None
                for _ in range(steps):
                    if not sim_instance.sim.is_finished:
                        last_state = sim_instance.sim.step()
                    else:
                        break
                if last_state is None:
                    last_state = sim_instance.sim.get_state(event_type="STEP")
                last_state["is_finished"] = sim_instance.sim.is_finished
                response = {"status": "ok", "state": last_state}
                
            elif cmd == "state":
                state = sim_instance.sim.get_state()
                state["is_finished"] = sim_instance.sim.is_finished
                response = {"status": "ok", "state": state}
                
            else:
                response = {"status": "error", "error": f"Unknown command: {cmd}"}
                
            status = '200 OK'
            
        except Exception as e:
            err_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
            response = {"status": "error", "error": err_msg}
            status = '500 Internal Server Error'
            
        response_headers = [('Content-Type', 'application/json')]
        start_response(status, response_headers)
        return [json.dumps(response).encode('utf-8')]

    status = '404 Not Found'
    response_headers = [('Content-Type', 'text/plain')]
    start_response(status, response_headers)
    return [b"Not Found"]