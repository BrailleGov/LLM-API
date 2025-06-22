const http = require('http');
const { URL } = require('url');
const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

async function fetchPage(url) {
  const headers = { 'User-Agent': USER_AGENT };
  try {
    const resp = await axios.get(url, { timeout: 5000, headers });
    if (resp.status !== 200) return { text: null, links: [] };
    const ct = resp.headers['content-type'] || '';
    if (!ct.includes('text/html')) return { text: null, links: [] };

    const $ = cheerio.load(resp.data);
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const links = [];
    $('a[href]').each((_, el) => {
      try {
        const href = $(el).attr('href');
        links.push(new URL(href, url).href);
      } catch (err) {
        // ignore malformed URLs
      }
    });
    return { text, links };
  } catch (err) {
    return { text: null, links: [] };
  }
}

function summarize(text) {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  const words = collapsed.split(' ');
  return words.slice(0, 300).join(' ');
}

async function googleFirstResult(query) {
  const params = { q: query };
  const headers = { 'User-Agent': USER_AGENT };
  try {
    const resp = await axios.get('https://www.google.com/search', {
      params,
      headers,
      timeout: 5000
    });
    if (resp.status !== 200) return null;
    const $ = cheerio.load(resp.data);
    const link = $('a[href^="/url?"]').attr('href');
    if (!link) return null;
    const parsed = new URL('https://www.google.com' + link);
    const q = parsed.searchParams.get('q');
    return q || null;
  } catch (err) {
    return null;
  }
}

async function search(query) {
  const first = await googleFirstResult(query);
  if (!first) return { url: null, summary: '' };
  const { text } = await fetchPage(first);
  if (!text) return { url: first, summary: '' };
  const summary = summarize(text);
  return { url: first, summary };
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  if (req.method !== 'GET' || parsed.pathname !== '/search') {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  const query = (parsed.searchParams.get('q') || '').trim();
  if (!query) {
    res.statusCode = 400;
    res.end('Missing query');
    return;
  }

  const result = await search(query);
  const data = JSON.stringify(result);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
});

if (require.main === module) {
  const port = process.argv[2] ? parseInt(process.argv[2], 10) : 8000;
  server.listen(port, () => {
    console.log(`Serving on port ${port}`);
  });
}

module.exports = { fetchPage, summarize, googleFirstResult, search, server };
