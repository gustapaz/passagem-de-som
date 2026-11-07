import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../scripts/local.mjs';
import {calendar} from '../shared/catalog.js';
import {api} from '../server/api.js';

const origin = 'https://example.invalid';
const day = calendar().days[1];
const input = overrides => ({id:crypto.randomUUID(),room:'subsolo',day,start:10,end:12,...overrides});
function send(db,body,override={}) {
  return api(new Request(origin+'/api/bookings',{method:'POST',headers:{origin,'Content-Type':'application/json',...override},body:JSON.stringify(body)}),db);
}
const schedule = db => api(new Request(origin+'/api/schedule?day='+day),db).then(response=>response.json());

test('intervalos parcialmente sobrepostos não podem ser gravados juntos',async()=>{
  const db = openDatabase();
  try {
    const requests = [input(),input({start:11,end:13})];
    const responses = await Promise.all(requests.map(body=>send(db,body)));
    assert.deepEqual(responses.map(response=>response.status).sort(),[201,409]);
    const {occupied} = await schedule(db);
    const inserted = occupied.filter(item=>item.room==='subsolo' && item.start<13);
    assert.equal(inserted.length,1);
    assert.equal(Object.hasOwn(inserted[0],'id'),false);
  } finally {db.close();}
});

test('reenvio é idempotente, intervalos contíguos coexistem e cancelamento libera o horário',async()=>{
  const db = openDatabase();
  try {
    const booking = input({end:11});
    const first = await Promise.all([send(db,booking),send(db,booking)]);
    assert.deepEqual(first.map(response=>response.status).sort(),[200,201]);
    assert.equal((await send(db,input({start:11,end:12}))).status,201);
    const cancel = id => api(new Request(origin+'/api/bookings',{method:'DELETE',headers:{origin,'X-Booking':id}}),db);
    assert.equal((await cancel(crypto.randomUUID())).status,204);
    assert.equal((await send(db,input({end:11}))).status,409);
    assert.equal((await cancel(booking.id)).status,204);
    assert.equal((await send(db,input({end:11}))).status,201);
  } finally {db.close();}
});

test('rejeita datas impossíveis, horários passados, duração excessiva e origem externa',async()=>{
  const db = openDatabase();
  try {
    for (const invalid of [input({day:'2026-02-30'}),input({end:14}),input({room:'inventada'}),input({day:'2001-01-01'})]) {
      assert.equal((await send(db,invalid)).status,400);
    }
    assert.equal((await send(db,input(),{origin:'https://other.invalid'})).status,403);
    assert.equal((await send(db,input({padding:'a'.repeat(1500)}))).status,400);
  } finally {db.close();}
});
