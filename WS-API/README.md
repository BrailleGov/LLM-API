# WS-API

A simple search web service implemented in Python. It sends a request to Google
for the query and returns the first result page with a short summary.

## Usage

Install the required Python packages:

```bash
pip install requests beautifulsoup4
```

Run the server:

```bash
python app.py [PORT]
```

It exposes `GET /search?q=<query>` which returns JSON:

```json
{ "url": "https://example.com/page", "summary": "first 300 words..." }
```

The service does not rely on the Google API; it simply fetches Google's search
results page and follows the first result link.
