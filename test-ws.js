const WebSocket = require('ws');


const sessionId = process.argv[2];
const clientName = process.argv[3] || 'client';

if(!sessionId){
    console.error('usage: node test-ws.js <sessionId> [clientName]');
    process.exit(1);
}

const ws = new WebSocket('ws://localhost:3001');

ws.on('open',()=>{
    console.log(`[${clientName}] connected joining ${sessionId}...`);
    ws.send(JSON.stringify({event:'join_session' , data:{sessionId}}));
});

ws.on('message',(raw)=>{
    const msg = JSON.parse(raw.toString());
    console.log(`[${clientName}] <-`,msg.event, JSON.stringify(msg.data));
});

ws.on('close',()=>console.log(`[${clientName}] closed`));
ws.on('error' ,(e)=>console.error(`[${clientName}] error`,e.message));

process.on('SIGINT',()=>{
    console.log(`\n[${clientName}] leaving...`);
    ws.send(JSON.stringify({event:'leave_session',data:{}}));
    setTimeout(()=>{ws.close(); process.exit(0)},100);
});