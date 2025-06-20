# LLM-API

Simple HTTP wrapper for Ollama.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```

The service listens on port `8080` and exposes a single `POST /generate` endpoint.

## Authentication

Valid API keys are stored in `apikeys.json`. Each request must provide an
`api_key` in the JSON body (or header). Requests with missing or invalid keys
will receive **401 Unauthorized**.
