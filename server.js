const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const app = express();
app.use(express.json());

const PORT = 8080;
let DISCORD_WEBHOOK = null;
try {
  const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')
  );
  DISCORD_WEBHOOK = config.DISCORD_WEBHOOK;
} catch (err) {
  // ignore errors - handled below
}
if (!DISCORD_WEBHOOK) {
  console.warn(
    'Warning: DISCORD_WEBHOOK not found in config.json. Webhook notifications will be disabled.'
  );
}

// Load API keys from apikeys/apikeys.json
const API_KEYS = new Set(
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'apikeys', 'apikeys.json'),
      'utf-8'
    )
  )
);

// Helper to send webhook notifications (fire and forget)
function sendWebhook(info) {
  if (!DISCORD_WEBHOOK) return;
  const embed = {
    title: 'LLM Request',
    fields: [
      { name: 'Status Code', value: String(info.status), inline: true },
      { name: 'Tokens Used', value: info.evalCount ? String(info.evalCount) : 'N/A', inline: true },
      { name: 'Duration', value: info.duration ? `${info.duration}ms` : 'N/A', inline: true },
      { name: 'API Key', value: info.apiKey || 'none', inline: true },
      { name: 'Client IP', value: info.ip || 'unknown', inline: true }
    ]
  };
  if (info.error) {
    embed.fields.push({ name: 'Error', value: info.error });
  }

  // Prepare payload for Discord webhook
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ embeds: [embed] }));

  let fileIndex = 0;
  if (info.prompt) {
    form.append(`files[${fileIndex}]`, JSON.stringify({ prompt: info.prompt }), {
      filename: 'input.json',
      contentType: 'application/json'
    });
    fileIndex += 1;
  }
  if (info.text) {
    form.append(`files[${fileIndex}]`, JSON.stringify({ text: info.text }), {
      filename: 'output.json',
      contentType: 'application/json'
    });
  }

  axios
    .post(DISCORD_WEBHOOK, form, { headers: form.getHeaders() })
    .catch(() => {});
}

app.post('/generate', async (req, res) => {
  const apiKey = req.body.api_key || req.get('api_key');
  if (!apiKey || !API_KEYS.has(apiKey)) {
    res.status(401).json({ error: 'Unauthorized' });
    sendWebhook({ status: 401, apiKey, ip: req.ip });
    return;
  }

  const prompt = req.body.prompt;
  if (!prompt) {
    res.status(400).json({ error: 'Missing prompt' });
    sendWebhook({ status: 400, apiKey, ip: req.ip });
    return;
  }

  const start = Date.now();
  try {
    const ollamaResp = await axios.post('http://localhost:11434/api/generate', {
      model: 'deepseek-r1:latest',
      prompt,
      stream: false
    }, { headers: { 'Content-Type': 'application/json' } });

    const duration = Date.now() - start;
    let text = ollamaResp.data.response;
    if (typeof text === 'string') {
      text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    }

    const evalCount = ollamaResp.data.eval_count;
    res.status(200).json({ text });

    sendWebhook({
      status: 200,
      evalCount,
      duration,
      apiKey,
      ip: req.ip,
      prompt,
      text
    });
  } catch (err) {
    const duration = Date.now() - start;
    const status = err.response
      ? err.response.status
      : err.code === 'ECONNREFUSED'
      ? 502
      : 500;
    let message;
    if (err.response && err.response.data && err.response.data.error) {
      message = err.response.data.error;
    } else if (err.code === 'ECONNREFUSED') {
      message = 'Upstream service unavailable';
    } else {
      message = err.message || 'Unknown error';
    }
    const evalCount = err.response && err.response.data ? err.response.data.eval_count : undefined;

    res.status(status).json({ error: message });

    sendWebhook({
      status,
      evalCount,
      duration,
      apiKey,
      ip: req.ip,
      prompt,
      error: message
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
