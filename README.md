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

### Environment

This repository includes a `.env` file with a sample Discord webhook for testing.
The server reads the following variable from the environment:

* `DISCORD_WEBHOOK` - Discord webhook URL used for request logging. If unset, webhook notifications are disabled and a warning is printed on startup.

## Authentication

Valid API keys are stored in `apikeys.json`. Each request must provide an
`api_key` in the JSON body (or header). Requests with missing or invalid keys
will receive **401 Unauthorized**.
