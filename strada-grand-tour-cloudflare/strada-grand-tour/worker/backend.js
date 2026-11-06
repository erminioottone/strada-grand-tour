const HEADERS={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'"};
const lengths=[1550,1750,1900,2100].map(n=>n*200),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const json=(data,status=200)=>new Response(JSON.stringify({...data,now:Date.now()}),{status,headers:{...HEADERS,'Content-Type':'application/json','Cache-Control':'no-store'}});
class GameError extends Error{constructor(message,status=400){super(message);this.status=status}}
const fail=(msg,status=400)=>{throw new GameError(msg,status)};
const random=n=>{const a=crypto.getRandomValues(new Uint8Array(n));return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')};
const hash=async token=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
async function body(request){if(Number(request.headers.get('content-length'))>4096)fail('Request too large.',413);const text=await request.text();if(text.length>4096)fail('Request too large.',413);try{return JSON.parse(text)}catch{fail('Please send valid game data.')}}
async function roomData(db,room){const p=await db.prepare('SELECT slot, car, distance, x, speed, elapsed, finished, updated FROM players WHERE room = ? ORDER BY slot').bind(room.code).all();return {code:room.code,settings:JSON.parse(room.settings),start:room.start,status:room.status,players:p.results}}
async function roomLookup(db,code){const room=await db.prepare('SELECT * FROM rooms WHERE code = ?').bind(code).first();if(!room)fail('That invitation code was not found.',404);if(room.expires<Date.now())fail('This room has expired. Create a new friend race.',410);return room}
async function authenticate(db,request,code){const auth=request.headers.get('authorization')||'';if(!/^Bearer [a-f0-9]{64}$/.test(auth))fail('Your invitation session is missing. Please rejoin.',401);const p=await db.prepare('SELECT * FROM players WHERE room = ? AND token = ?').bind(code,await hash(auth.slice(7))).first();if(!p)fail('You are not a driver in this room.',403);return p}
export async function handleAPI(request,env){try{const url=new URL(request.url),path=url.pathname,method=request.method;
if(method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)fail('Please open the game to use this feature.',403);
if(!env.DB)return json({error:'Friend races are temporarily unavailable. You can still play Time trial or Rivals.'},503);
const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
if(path==='/api/rooms'&&method==='POST'){
const b=await body(request),s=b.settings;if(!s||!integer(s.stage,0,3)||!integer(s.weather,0,2)||!integer(s.difficulty,0,2)||!integer(b.car,0,4))fail('Choose a valid car and race setup.');
const now=Date.now();await db.prepare('DELETE FROM rooms WHERE expires < ?').bind(now).run();const count=await db.prepare('SELECT COUNT(*) AS count FROM rooms').first();if(count.count>=2000)fail('The starting grid is full. Please try again later.',429);
const settings=JSON.stringify({stage:s.stage,weather:s.weather,difficulty:s.difficulty}),token=random(32),tokenHash=await hash(token);let code;for(let tries=0;tries<3;tries++){code=Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>alphabet[n%32]).join('');try{await db.batch([db.prepare('INSERT INTO rooms (code,settings,created,expires,status) VALUES (?,?,?,?,?)').bind(code,settings,now,now+30*60*1000,'waiting'),db.prepare('INSERT INTO players (room,slot,token,car,updated) VALUES (?,1,?,?,?)').bind(code,tokenHash,b.car,now)]);break}catch(e){if(tries===2)throw e}}
return json({code,token,settings:JSON.parse(settings)},201)}
const m=path.match(/^\/api\/rooms\/([A-HJ-NP-Z2-9]{8})(?:\/(join|start|state|leave))?$/);if(!m)fail('This road does not exist.',404);const code=m[1],action=m[2],room=await roomLookup(db,code);
if(action==='join'&&method==='POST'){
if(room.status!=='waiting'||room.start)fail('This race has already started or closed. Ask for a new code.',409);const b=await body(request);if(!integer(b.car,0,4))fail('Choose a valid car.');const token=random(32);const result=await db.prepare('INSERT OR IGNORE INTO players (room,slot,token,car,updated) SELECT ?,2,?,?,? WHERE EXISTS (SELECT 1 FROM rooms WHERE code = ? AND status = ? AND start IS NULL)').bind(code,await hash(token),b.car,Date.now(),code,'waiting').run();if(!result.meta.changes)fail('This race already has two drivers.',409);return json({code,token,settings:JSON.parse(room.settings)},201)}
const player=await authenticate(db,request,code);
if(!action&&method==='GET')return json(await roomData(db,room));
if(action==='start'&&method==='POST'){
if(player.slot!==1)fail('Only the host can start the race.',403);if(room.status==='closed')fail('This room has closed. Create a new one.',409);const start=Date.now()+6000;
await db.prepare('UPDATE rooms SET start = ?, status = ? WHERE code = ? AND start IS NULL AND status = ? AND (SELECT COUNT(*) FROM players WHERE room = ?) = 2').bind(start,'racing',code,'waiting',code).run();const updated=await roomLookup(db,code);if(!updated.start)fail('Wait for your friend to join first.',409);return json({start:updated.start})}
if(action==='state'&&method==='POST'){
if(!room.start||room.status==='waiting')fail('Wait for the race to start.',409);if(room.status==='closed')return json(await roomData(db,room));const b=await body(request),len=lengths[JSON.parse(room.settings).stage],now=Date.now();if(!finite(b.distance,0,len)||!finite(b.x,-2,2)||!finite(b.speed,0,7300)||typeof b.finished!=='boolean')fail('Invalid driving data.');if(b.distance>Math.max(0,(now-room.start)/1000)*7300+2500)fail('Your race clock is out of sync. Please rejoin.',409);if(b.finished&&b.distance<len-1)fail('Keep driving to the finish line.');if(b.distance+100<player.distance)fail('Progress cannot go backwards.');const elapsed=b.finished?Math.max(0,(now-room.start)/1000):null;
await db.prepare('UPDATE players SET distance = ?, x = ?, speed = ?, finished = ?, elapsed = ?, updated = ? WHERE room = ? AND slot = ? AND finished = 0').bind(b.distance,b.x,b.speed,b.finished?1:0,elapsed,now,code,player.slot).run();return json(await roomData(db,room))}
if(action==='leave'&&method==='POST'){
if(player.slot===1||room.start)await db.prepare('UPDATE rooms SET status = ? WHERE code = ?').bind('closed',code).run();else await db.prepare('DELETE FROM players WHERE room = ? AND slot = ?').bind(code,player.slot).run();return json({ok:true})}
fail('This action is not available.',405)
}catch(e){if(e instanceof GameError)return json({error:e.message},e.status);console.error('Game API failure',e?.message);return json({error:'The starting line is busy. Please try again in a moment.'},503)}}
export function serveAsset(request,assets){const path=new URL(request.url).pathname;const asset=assets[path==='/'?'/index.html':path];if(!asset)return new Response('Road not found',{status:404,headers:HEADERS});return new Response(request.method==='HEAD'?null:asset.body,{headers:{...HEADERS,'Content-Type':asset.type,'Cache-Control':'no-cache'}})}
