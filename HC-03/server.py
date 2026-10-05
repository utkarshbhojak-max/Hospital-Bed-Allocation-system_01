import os
import json
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer
from simulator import DiscreteEventSimulator
from policy import BedAllocationPolicy

class SimServer:
    def __init__(self):
        self.policy = BedAllocationPolicy()
        self.sim = DiscreteEventSimulator(policy=self.policy, seed=20260911, n_patients=500)
        self.sim.reset()

sim_instance = SimServer()

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/cmd':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                req = json.loads(post_data)
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
                    
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
            except Exception as e:
                err_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
                response = {"status": "error", "error": err_msg}
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

def run():
    port = int(os.environ.get('PORT', 8000))
    server = HTTPServer(('0.0.0.0', port), RequestHandler)
    print(f"Starting server on port {port}...")
    server.serve_forever()

if __name__ == '__main__':
    run()
