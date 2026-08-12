const wsUrl = process.argv[2];
const code = process.argv[3];

const ws = new WebSocket(wsUrl);
let id = 1;

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ id: id++, method: 'Runtime.evaluate', params: { expression: code, awaitPromise: true, returnByValue: true } }));
});

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id) {
    console.log(JSON.stringify(msg.result, null, 2));
    ws.close();
    process.exit(0);
  }
});

ws.addEventListener('error', (e) => {
  console.error('WS error', e.message);
  process.exit(1);
});

setTimeout(() => { console.error('timeout'); process.exit(1); }, 15000);
