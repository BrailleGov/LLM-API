# WS-API

A simple search web service implemented in Node.js. It sends a request to Google
for the query and returns the first result page with a short summary.

## Usage

Install the required packages:

```bash
npm install
```

Run the server:

```bash
node app.js [PORT]
```

It exposes `GET /search?q=<query>` which returns JSON:

```json
{ "url": "https://example.com/page", "summary": "first 300 words..." }
```

Example request using `curl`:

```bash
curl "http://localhost:8000/search?q=openai"
```

When you run the server you will see log messages similar to:

```
WS-API server listening on port 8000
Search request: openai
First result for "openai": https://openai.com/
```

The service does not rely on the Google API; it simply fetches Google's search
results page and follows the first result link.

