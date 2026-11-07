import {calendar, fixtures, intersects, rooms} from '../shared/catalog.js';

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const invalid = () => json({error:'Informe uma sala, data e intervalo válidos.'},400);
const conflict = () => json({error:'Outra reserva ocupou parte desse intervalo. Escolha outro horário.'},409);

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  try {
    for (;;) {
      const {done,value} = await reader.read();
      if (done) return JSON.parse(body + decoder.decode());
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); return null; }
      body += decoder.decode(value,{stream:true});
    }
  } catch { return null; }
}

export async function api(request, db) {
  const url = new URL(request.url);
  const {days,hour} = calendar();
  try {
    if (url.pathname === '/api/schedule' && request.method === 'GET') {
      const day = url.searchParams.get('day');
      if (!days.includes(day)) return invalid();
      const {results} = await db.prepare('SELECT room, start, end FROM bookings WHERE day = ? ORDER BY room, start').bind(day).all();
      return json({day, occupied:[...fixtures(day),...results], cutoff:day === days[0] ? hour + 1 : 10});
    }
    if (url.pathname !== '/api/bookings' || !['POST','DELETE'].includes(request.method)) return json({error:'Rota inexistente.'},404);
    if (request.headers.get('origin') !== url.origin) return json({error:'Origem inválida.'},403);

    if (request.method === 'DELETE') {
      const id = request.headers.get('X-Booking');
      if (!id || !idPattern.test(id)) return invalid();
      await db.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();
      return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
    }
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return invalid();
    const op = await readBody(request);
    if (!op || typeof op.id !== 'string' || !idPattern.test(op.id) ||
        !rooms.some(room => room.id === op.room) || !days.includes(op.day) ||
        !Number.isInteger(op.start) || !Number.isInteger(op.end) ||
        op.start < 10 || op.end > 22 || op.end - op.start < 1 || op.end - op.start > 3) return invalid();
    const {id,room,day,start,end} = op;
    const reservation = {id,room,day,start,end};
    const replay = async () => {
      const previous = await db.prepare('SELECT room, day, start, end FROM bookings WHERE id = ?').bind(id).first();
      return previous && previous.room === room && previous.day === day && previous.start === start && previous.end === end;
    };
    if ((day === days[0] && start <= hour) || fixtures(day).some(block => block.room === room && intersects(block,op))) {
      return await replay() ? json(reservation) : conflict();
    }

    const result = await db.prepare(`INSERT OR IGNORE INTO bookings (id, room, day, start, end)
      SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (
        SELECT 1 FROM bookings WHERE day = ? AND room = ? AND start < ? AND end > ?
      )`).bind(id,room,day,start,end,day,room,end,start).run();
    if (result.meta.changes === 1) {
      await db.prepare('DELETE FROM bookings WHERE day < ?').bind(days[0]).run().catch(() => {});
      return json(reservation,201);
    }
    return await replay() ? json(reservation) : conflict();
  } catch {
    return json({error:'A agenda está indisponível. Tente novamente.'},503);
  }
}
