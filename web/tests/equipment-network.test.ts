import {it,expect} from 'vitest';
import {WebSocket,WebSocketServer} from 'ws';
import type {AddressInfo} from 'node:net';
import {BattleRooms} from '../server/rooms';
import {PROTOCOL_VERSION,type StateMessage} from '../src/network/protocol';

it('settles equipment on the server, broadcasts both inventories, and resets them in a rematch',async()=>{
 const wss=new WebSocketServer({host:'127.0.0.1',port:0});const rooms=new BattleRooms(wss);
 await new Promise<void>(resolve=>wss.once('listening',resolve));
 async function connect(){
  const socket=new WebSocket(`ws://127.0.0.1:${(wss.address() as AddressInfo).port}`);
  const states:StateMessage[]=[];let code='';
  socket.on('message',data=>{const message=JSON.parse(data.toString());if(message.type==='welcome'){code=message.code;socket.send(JSON.stringify({type:'assets-ready'}));}if(message.type==='state')states.push(message);});
  await new Promise<void>(resolve=>socket.once('open',resolve));
  return {socket,states,get code(){return code;},send:(message:object)=>socket.send(JSON.stringify(message))};
 }
 const a=await connect(),b=await connect();
 const until=async(check:()=>boolean)=>{for(let n=0;n<300;n++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Equipment authority timeout');};
 try{
  a.send({type:'create',version:PROTOCOL_VERSION});await until(()=>!!a.code);
  b.send({type:'join',code:a.code,version:PROTOCOL_VERSION});await until(()=>!!b.code);
  a.send({type:'ready'});b.send({type:'ready'});
  const room=rooms.rooms.get(a.code)!;await until(()=>room.countdownAt>0);room.countdownAt=Date.now()-1;await until(()=>room.match.phase==='playing');
  a.send({type:'command',seq:1,team:'red',command:{kind:'buy',itemId:1055,gold:99999,cost:0}});
  b.send({type:'command',seq:1,command:{kind:'buy',itemId:1001}});
  await until(()=>a.states.some(state=>state.state.entities.some(e=>e.team==='red'&&e.inventory?.includes(1001)))&&b.states.some(state=>state.state.entities.some(e=>e.team==='blue'&&e.inventory?.includes(1055))));
  expect(room.match.hero('blue').gold).toBe(50);expect(room.match.hero('red').gold).toBe(200);
  a.send({type:'command',seq:2,command:{kind:'buy',itemId:3031}});
  await until(()=>room.players[0].seq===2);expect(room.match.hero('blue').inventory).not.toContain(3031);
  a.send({type:'command',seq:3,command:{kind:'sell',slot:0}});await until(()=>room.match.hero('blue').gold===230);
  expect(room.match.hero('red').inventory).toContain(1001);
  room.match.hero('blue').gold=100000;
  a.send({type:'command',seq:4,command:{kind:'buy',itemId:3157}});await until(()=>room.match.hero('blue').inventory?.includes(3157)??false);
  a.send({type:'command',seq:5,command:{kind:'use-item',slot:0,point:room.match.hero('blue')}});
  await until(()=>b.states.some(state=>state.state.entities.some(e=>e.team==='blue'&&(e.stasisUntil??0)>state.state.time)));
  expect(room.match.hero('red').stasisUntil??0).toBe(0);
  room.match.damage(room.match.hero('blue'),room.match.hero('red'),99999,false,'ignite');
  await until(()=>room.match.phase==='ended');a.send({type:'ready'});b.send({type:'ready'});
  await until(()=>room.round===2&&room.countdownAt>0);
  expect(room.match.hero('blue').inventory).toEqual(Array(6).fill(null));expect(room.match.hero('red').inventory).toEqual(Array(6).fill(null));expect(room.match.hero('blue').gold).toBe(500);
 }finally{a.socket.close();b.socket.close();rooms.dispose();}
});
