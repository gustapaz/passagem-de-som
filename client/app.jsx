import {render} from 'preact';
import {useEffect,useRef,useState} from 'preact/hooks';
import {rooms,hours,hour,calendar,intersects} from '../shared/catalog.js';

const dayLabel = new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short',timeZone:'UTC'});
const labelDay = day => dayLabel.format(new Date(day+'T12:00:00Z'));
const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const storageKey = 'passagem-de-som:reservas';
function savedBookings() {
  try { return JSON.parse(localStorage.getItem(storageKey)) ?? []; }
  catch { return []; }
}
async function api(path,options) {
  const response = await fetch('/api/'+path,{...options,signal:options?.signal ?? AbortSignal.timeout(10000)});
  return {status:response.status,data:response.status === 204 ? null : await response.json()};
}

function App() {
  const {days} = calendar();
  const [day,setDay] = useState(days[1]);
  const [people,setPeople] = useState(1);
  const [gear,setGear] = useState('');
  const [duration,setDuration] = useState(1);
  const [schedule,setSchedule] = useState(null);
  const [issue,setIssue] = useState('');
  const [version,setVersion] = useState(0);
  const [selection,setSelection] = useState(null);
  const [receipt,setReceipt] = useState(null);
  const [bookings,setBookings] = useState(savedBookings);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const [dialogError,setDialogError] = useState('');
  const bookingDialog = useRef(null);
  const listDialog = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setIssue('');
    api('schedule?day='+day,{signal:controller.signal}).then(({status,data}) => {
      if (controller.signal.aborted) return;
      if (status === 200) setSchedule(data);
      else setIssue(data.error ?? 'Não foi possível consultar a agenda.');
    }).catch(() => { if (!controller.signal.aborted) setIssue('Sem acesso à agenda. Confira a conexão e tente novamente.'); });
    return () => controller.abort();
  },[day,version]);

  useEffect(() => {
    const refresh = event => { if (event.key === storageKey) {setBookings(savedBookings());setVersion(value=>value+1);} };
    window.addEventListener('storage',refresh);
    return () => window.removeEventListener('storage',refresh);
  },[]);

  const shown = rooms.filter(room => room.capacity >= people && (!gear || room.gear.includes(gear)));
  const ready = !issue && schedule?.day === day;
  const reserved = (room,start) => schedule?.occupied.some(block => block.room === room && intersects(block,{start,end:start+1}));
  const canBook = (room,start) => ready && start >= schedule.cutoff && start+duration <= 22 &&
    !schedule.occupied.some(block => block.room === room && intersects(block,{start,end:start+duration}));

  function remember(next) {
    setBookings(next);
    try { localStorage.setItem(storageKey,JSON.stringify(next)); }
    catch { setNotice('O navegador não guardou seu comprovante. Mantenha esta página aberta para cancelar.'); }
  }

  function choose(room,start) {
    setSelection({id:crypto.randomUUID(),room,day,start,end:start+duration});
    setReceipt(null);
    setDialogError('');
    bookingDialog.current.showModal();
  }

  async function confirm() {
    if (busy || !selection) return;
    setBusy(true);
    setDialogError('');
    try {
      const {status,data} = await api('bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(selection)});
      if (status === 201 || status === 200) {
        setReceipt(data);
        const known = new Map([...bookings,...savedBookings()].map(item=>[item.id,item]));
        known.set(data.id,data);
        remember([...known.values()].filter(item=>item.day>=days[0]));
        setVersion(value=>value+1);
      } else {
        setDialogError(data.error ?? 'A reserva não pôde ser confirmada.');
        if (status === 409) setVersion(value=>value+1);
      }
    } catch { setDialogError('A confirmação não chegou. Tente novamente para consultar o mesmo pedido.'); }
    finally { setBusy(false); }
  }

  async function cancel(id) {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const {status} = await api('bookings',{method:'DELETE',headers:{'X-Booking':id}});
      if (status !== 204) throw Error();
      const known = new Map([...bookings,...savedBookings()].map(item=>[item.id,item]));
      known.delete(id);
      remember([...known.values()]);
      setNotice('Reserva cancelada. O horário voltou à agenda.');
      setVersion(value=>value+1);
    } catch { setNotice('Não foi possível cancelar. Tente novamente.'); }
    finally { setBusy(false); }
  }

  const selectedRoom = rooms.find(room=>room.id===selection?.room);
  return <>
    <a class="skip" href="#agenda">Pular para a agenda</a>
    <header class="mast">
      <a href="/" class="wordmark"><img src="/mark.svg" alt="" width="30" height="30"/> PASSAGEM<br/>DE SOM</a>
      <span class="index">SÃO PAULO / AGENDA DE ENSAIOS</span>
      <button class="outline" onClick={()=>{setNotice('');listDialog.current.showModal();}}>Minhas reservas <span>{bookings.filter(item=>item.day>=days[0]).length}</span></button>
    </header>
    <main>
      <section class="opening" aria-labelledby="title">
        <div><p class="eyebrow"><i/> ESTÚDIOS DE ENSAIO / DEMO</p><h1 id="title">Bora fazer <em>som?</em></h1>
        <p>Escolha a sala, encontre o horário e reserve o tempo que a banda precisa.</p></div>
        <div class="signal" aria-hidden="true">
          <div class="meter">{[16,25,37,59,32,73,86,46,63,94,70,42,62,35,54,30,22].map((height,index)=><i key={index} style={{'--height':height+'%','--delay':index*24+'ms'}}/>)}</div>
          <div class="signal-meta"><span>CH 01—03</span><span>PRONTO PARA O ENSAIO</span></div>
        </div>
      </section>
      <section class="board" id="agenda" aria-labelledby="agenda-title">
        <div class="board-head"><div><p class="eyebrow">01 / ESCOLHA O HORÁRIO</p><h2 id="agenda-title">Agenda das salas</h2></div>
          <p class="legend"><span class="free"/> Livre <span class="taken"/> Ocupado <span class="unavailable"/> Indisponível</p></div>
        <div class="filters">
          <label>Dia<select value={day} onChange={e=>setDay(e.currentTarget.value)}>{days.map((value,i)=><option value={value} key={value}>{i===0?'Hoje · ':i===1?'Amanhã · ':''}{labelDay(value)}</option>)}</select></label>
          <label>Pessoas<select value={people} onChange={e=>setPeople(Number(e.currentTarget.value))}>{[1,2,3,4,5,6,7,8,9].map(value=><option key={value}>{value}</option>)}</select></label>
          <label>Equipamento<select value={gear} onChange={e=>setGear(e.currentTarget.value)}><option value="">Qualquer</option>{['Bateria','Teclado','Amplificadores','Voz'].map(value=><option key={value}>{value}</option>)}</select></label>
          <label>Duração<select value={duration} onChange={e=>setDuration(Number(e.currentTarget.value))}>{[1,2,3].map(value=><option value={value} key={value}>{value} {value===1?'hora':'horas'}</option>)}</select></label>
        </div>
        {issue ? <p role="alert" class="message">{issue} <button class="light" onClick={()=>setVersion(value=>value+1)}>Tentar novamente</button></p>
          : !ready && <p class="message" role="status">Consultando a agenda…</p>}
        {!shown.length && <p class="message">Nenhuma sala atende a esses filtros.</p>}
        {shown.map((room)=><article class="room" key={room.id} aria-labelledby={room.id}>
          <div class="room-info"><span class="chip" style={{background:room.color}}>{room.name.split(' ').at(-1)}</span><div><h3 id={room.id}>{room.name}</h3><p>{room.district} · até {room.capacity} pessoas · {money.format(room.rate)}/h</p></div></div>
          <details><summary>Sobre a sala</summary><p>{room.description} {room.gear.join(' · ')}.</p></details>
          <div class="timeline" aria-label={'Horários de '+room.name}>{hours.map(start=>{
            const taken = ready && reserved(room.id,start);
            const available = canBook(room.id,start);
            return <button class={'slot '+(taken?'taken':available?'free':'unavailable')} key={start} disabled={!available}
              aria-label={room.name+' às '+hour(start)+(taken?', ocupado':available?', livre':', indisponível')} onClick={()=>choose(room.id,start)}>{hour(start)}</button>;
          })}</div>
        </article>)}
      </section>
    </main>
    <footer><span>PASSAGEM DE SOM / ESTUDO FULL-STACK</span><span>Salas fictícias e valores ilustrativos. Fuso de São Paulo.</span></footer>
    <dialog ref={bookingDialog} aria-labelledby="booking-title" onCancel={e=>{if(busy)e.preventDefault();}}>
      {selection && <><p class="eyebrow">02 / {receipt?'COMPROVANTE':'CONFIRME O HORÁRIO'}</p><h2 id="booking-title">{receipt?'Reserva confirmada':selectedRoom.name}</h2>
        <p>{selectedRoom.name} · {labelDay(selection.day)} · {hour(selection.start)}–{hour(selection.end)}</p>
        <p class="price">{money.format(selectedRoom.rate*(selection.end-selection.start))} <small>valor simulado</small></p>
        {dialogError && <p role="alert" class="message">{dialogError}</p>}
        {receipt && <p role="status">Seu horário está guardado em Minhas reservas neste navegador.</p>}
        <div class="dialog-actions"><button class="light" disabled={busy} onClick={()=>bookingDialog.current.close()}>{receipt?'Fechar':'Voltar'}</button>
          {!receipt && <button class="primary" disabled={busy} onClick={confirm}>{busy?'Confirmando…':'Confirmar reserva'}</button>}</div></>}
    </dialog>
    <dialog ref={listDialog} aria-labelledby="list-title" onCancel={e=>{if(busy)e.preventDefault();}}>
      <p class="eyebrow">03 / SEUS HORÁRIOS</p><h2 id="list-title">Minhas reservas</h2>
      <p role="status">{notice}</p>
      {bookings.filter(item=>item.day>=days[0]).length ? <ul class="receipts">{bookings.filter(item=>item.day>=days[0]).map(item=><li key={item.id}>
        <span><strong>{rooms.find(room=>room.id===item.room)?.name}</strong><br/>{labelDay(item.day)} · {hour(item.start)}–{hour(item.end)}</span>
        <button class="light" disabled={busy} onClick={()=>cancel(item.id)}>Cancelar reserva</button></li>)}</ul> : <p>Você ainda não tem reservas neste navegador.</p>}
      <div class="dialog-actions"><button class="primary" disabled={busy} onClick={()=>listDialog.current.close()}>Fechar</button></div>
    </dialog>
  </>;
}

render(<App/>,document.getElementById('app'));
