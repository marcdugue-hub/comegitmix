"""Local static server for development and the Playwright tests (`npm start`).

Same as `python3 -m http.server 8080`, with a larger listen queue: the default queue (5) makes
parallel browsers lose connections (ERR_CONNECTION_RESET) when they load the ~60 ES modules at once.
Serves the current directory. Usage: python3 scripts/serve.py [port]
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Server(ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):  # keep the test output readable
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    with Server(("", port), partial(Handler, directory=".")) as httpd:
        print(f"Serving on http://localhost:{port}")
        httpd.serve_forever()
