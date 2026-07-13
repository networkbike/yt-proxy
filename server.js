// YouTube transcript proxy
// Run from an IP that's not rate-limited by YouTube.
// Render's shared IP is throttled; this proxy uses a different egress.

import http from 'node:http';
import { YoutubeTranscript } from 'youtube-transcript';

const PORT = process.env.PORT || 8765;

const server = http.createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', ...cors });
    return res.end(JSON.stringify({ status: 'ok', service: 'yt-proxy' }));
  }

  if (url.pathname === '/transcript') {
    const videoId = url.searchParams.get('id');
    if (!videoId) {
      res.writeHead(400, { 'content-type': 'application/json', ...cors });
      return res.end(JSON.stringify({ error: 'missing id param' }));
    }

    try {
      const segs = await YoutubeTranscript.fetchTranscript(videoId);
      const transcript = segs.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
      res.writeHead(200, { 'content-type': 'application/json', ...cors });
      return res.end(JSON.stringify({
        videoId,
        transcript: transcript.slice(0, 8000),
        length: transcript.length,
        source: 'youtube-transcript',
      }));
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json', ...cors });
      return res.end(JSON.stringify({
        videoId,
        error: err.message?.slice(0, 200),
      }));
    }
  }

  res.writeHead(404, cors);
  res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`yt-proxy listening on ${PORT}`);
});
