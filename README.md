# LLM-API

Simple HTTP wrapper for Ollama.

This server assumes an Ollama instance is running locally at
`http://localhost:11434`.

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
This endpoint returns a JSON response with a single `text` field containing the
final model output. Any `<think>` blocks produced by the model are removed
before the text is returned.

### Configuration

Create a `config.json` file in the project root containing your Discord
webhook URL:

```json
{
  "DISCORD_WEBHOOK": "https://discord.com/api/webhooks/<your-webhook>"
}
```

An example file `config.example.json` is provided. If `config.json` is missing,
webhook notifications are disabled and a warning is printed on startup.

## Authentication

Valid API keys should be stored in `apikeys/apikeys.json` (this path is ignored by git).
Copy `apikeys.example.json` to that location and edit it to contain an array of allowed keys.
Each request must provide an `api_key` in the JSON body (or header). Requests with
missing or invalid keys will receive **401 Unauthorized**.

## API Usage Example

Once the server is running you can send a request to `/generate` to obtain text from the model:

```bash
curl -X POST https://hanging.wang/generate \
     -H "Content-Type: application/json" \
     -d '{"api_key": "<your-key>", "prompt": "Tell me a joke"}'
```

Replace `<your-key>` with a value from `apikeys/apikeys.json`. The response will look like:

```json
{ "text": "...model output..." }
```
