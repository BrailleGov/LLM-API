import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, urljoin, urlsplit, parse_qs as parse_qs_url

import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0 Safari/537.36"
)


def fetch_page(url):
    """Fetch a URL and return text and links if it's HTML."""
    headers = {"User-Agent": USER_AGENT}
    try:
        resp = requests.get(url, timeout=5, headers=headers)
    except requests.RequestException:
        return None, []

    if resp.status_code != 200:
        return None, []

    ct = resp.headers.get("Content-Type", "")
    if "text/html" not in ct:
        return None, []

    soup = BeautifulSoup(resp.text, "html.parser")
    text = soup.get_text(separator=" ", strip=True)

    links = []
    for a in soup.find_all("a", href=True):
        links.append(urljoin(url, a["href"]))
    return text, links

def summarize(text):
    collapsed = " ".join(text.split())
    words = collapsed.split()
    return " ".join(words[:300])


def google_first_result(query):
    """Return the first search result URL from Google."""
    params = {"q": query}
    headers = {"User-Agent": USER_AGENT}
    try:
        resp = requests.get(
            "https://www.google.com/search", params=params, headers=headers, timeout=5
        )
    except requests.RequestException:
        return None
    if resp.status_code != 200:
        return None
    soup = BeautifulSoup(resp.text, "html.parser")
    link = soup.find("a", href=True, attrs={"href": lambda x: x and x.startswith("/url?")})
    if not link:
        return None
    parsed = urlsplit(link["href"])
    q = parse_qs_url(parsed.query).get("q")
    if not q:
        return None
    return q[0]


def search(query):
    """Search Google and return URL and summary of first result."""
    first = google_first_result(query)
    if not first:
        return {"url": None, "summary": ""}
    text, _ = fetch_page(first)
    if not text:
        return {"url": first, "summary": ""}
    summary = summarize(text)
    return {"url": first, "summary": summary}


class SearchHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/search":
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not found")
            return

        params = parse_qs(parsed.query)
        query = params.get("q", [""])[0].strip()
        if not query:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Missing query")
            return

        result = search(query)
        data = json.dumps(result).encode()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        # Suppress default logging to keep output clean
        return


def run(server_class=HTTPServer, handler_class=SearchHandler, port=8000):
    server_address = ("", port)
    httpd = server_class(server_address, handler_class)
    print(f"Serving on port {port}")
    httpd.serve_forever()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run(port=port)
