export const rooms = [
  {id:'subsolo', name:'Subsolo 04', district:'Barra Funda', capacity:6, rate:80, gear:['Bateria','Amplificadores','Voz'], color:'#e5f279', description:'Uma sala de piso preto e teto baixo para ensaios com a banda inteira.'},
  {id:'estereo', name:'Estéreo 12', district:'Pinheiros', capacity:4, rate:65, gear:['Teclado','Voz'], color:'#ffc4aa', description:'Teclas, vozes e arranjos ganham espaço nesta sala compacta.'},
  {id:'plateia', name:'Plateia 03', district:'Vila Mariana', capacity:9, rate:115, gear:['Bateria','Teclado','Amplificadores','Voz'], color:'#c6c1ff', description:'Palco baixo, espaço para formações maiores e monitoramento de voz.'},
];
export const hours = Array.from({length:12}, (_, i) => i + 10);
export const hour = value => String(value).padStart(2,'0') + ':00';
export const intersects = (a,b) => a.start < b.end && a.end > b.start;
const formatter = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23'});
export function calendar(now = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
  const base = Date.UTC(+parts.year, +parts.month - 1, +parts.day);
  return {days:Array.from({length:14}, (_, i) => new Date(base + i * 86400000).toISOString().slice(0,10)), hour:+parts.hour};
}
export function fixtures(day) {
  const offset = Number(day.slice(-2)) % 3;
  return [
    {room:'subsolo',start:13 + offset,end:15 + offset},
    {room:'estereo',start:16,end:17},
    {room:'plateia',start:11 + offset,end:12 + offset},
  ];
}
