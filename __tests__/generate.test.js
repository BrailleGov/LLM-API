const request = require('supertest');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// create temporary apikeys file for tests
const apikeysDir = path.join(__dirname, '..', 'apikeys');
const apikeysPath = path.join(apikeysDir, 'apikeys.json');
fs.mkdirSync(apikeysDir, { recursive: true });
fs.writeFileSync(apikeysPath, '["key1"]');

const app = require('../server');

jest.mock('axios');

const validKey = 'key1';
const mockResponse = {
  data: { response: 'Hello world', eval_count: 42 }
};

afterAll(() => {
  fs.rmSync(apikeysDir, { recursive: true, force: true });
});

beforeEach(() => {
  axios.post.mockReset();
});

describe('POST /generate', () => {
  test('rejects missing api key', async () => {
    const res = await request(app).post('/generate').send({ prompt: 'hi' });
    expect(res.status).toBe(401);
  });

  test('rejects invalid api key', async () => {
    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'hi', api_key: 'bad' });
    expect(res.status).toBe(401);
  });

  test('rejects missing prompt', async () => {
    const res = await request(app)
      .post('/generate')
      .send({ api_key: validKey });
    expect(res.status).toBe(400);
  });

  test('returns generated text for valid request', async () => {
    axios.post.mockResolvedValueOnce(mockResponse); // for ollama call
    axios.post.mockResolvedValue({}); // for webhook
    const res = await request(app)
      .post('/generate')
      .send({ prompt: 'hi', api_key: validKey });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'Hello world' });
  });
});
