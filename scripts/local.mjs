import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {mkdirSync, readFileSync} from 'node:fs';
import worker from '../dist/server/index.js';

export function openDatabase(file = ':memory:') {
  const sqlite = new DatabaseSync(file);
  sqlite.exec(readFileSync(new URL('../migrations/0001_bookings.sql', import.meta.url), 'utf8'));
  return {
    close: () => sqlite.close(),
    prepare(query) {
      const stmt = sqlite.prepare(query);
      return {bind: (...values) => ({
        first: async () => stmt.get(...values) ?? null, all: async () => ({results:stmt.all(...values)}),
        run: async () => ({meta: stmt.run(...values)}),
      })};
    },
  };
}

if (process.argv[1]?.endsWith('local.mjs')) {
  mkdirSync('.local', {recursive: true});
  const db = openDatabase(process.env.TEST_DB || '.local/passagem-de-som.sqlite');
  const port = Number(process.env.PORT ?? 4173);
  createServer(async (req, res) => {
    try {
      const init = {method: req.method, headers: req.headers};
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        init.body = Readable.toWeb(req);
        init.duplex = 'half';
      }
      const response = await worker.fetch(new Request('http://' + req.headers.host + req.url, init), {DB: db});
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) Readable.fromWeb(response.body).pipe(res);
      else res.end();
    } catch {
      res.writeHead(500).end('Falha local.');
    }
  }).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port));
}
