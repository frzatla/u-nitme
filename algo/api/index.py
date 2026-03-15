import json
import os
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler

ALGO_PATH = os.path.join(os.path.dirname(__file__), "../src/algo1.py")


class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        # Read request body
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._respond(400, {"error": "Invalid JSON body"})
            return

        # Validate required field
        if not data.get("course"):
            self._respond(400, {"error": "Missing required field: course"})
            return

        # Build subprocess args from JSON body
        # Supported fields: course, specialisation, major, minor, campus, years
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            output_path = tmp.name

        try:
            cmd = [sys.executable, ALGO_PATH, "--course", str(data["course"]), "--output", output_path]

            if data.get("specialisation"):
                cmd += ["--specialisation", str(data["specialisation"])]
            if data.get("major"):
                cmd += ["--major", str(data["major"])]
            if data.get("minor"):
                cmd += ["--minor", str(data["minor"])]
            if data.get("campus"):
                cmd += ["--campus", str(data["campus"])]
            if data.get("years") is not None:
                cmd += ["--years", str(int(data["years"]))]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode != 0:
                self._respond(500, {
                    "error": "Algorithm failed",
                    "detail": result.stderr.strip(),
                })
                return

            with open(output_path, "r", encoding="utf-8") as f:
                schedule = json.load(f)

            self._respond(200, schedule)

        except subprocess.TimeoutExpired:
            self._respond(504, {"error": "Algorithm timed out"})
        except FileNotFoundError:
            self._respond(500, {"error": "Output file not found — algo may have crashed"})
        finally:
            if os.path.exists(output_path):
                os.remove(output_path)

    def _respond(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
