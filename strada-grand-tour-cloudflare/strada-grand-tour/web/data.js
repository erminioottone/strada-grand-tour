export const CARS = [
 {name:'Ferrari 250 GTO',year:1962,color:'#b5392b',dark:'#75251e',type:'The spirited icon',shape:'coupe',pace:1,grip:.9,note:'Bonus-era legend · Introduced after the original race era.'},
 {name:'Ferrari 166 MM',year:1948,color:'#bc4333',dark:'#762d23',type:'The open-road original',shape:'spider',pace:.94,grip:1,note:'A Mille Miglia winner · Celebrating the 1949 winning model.'},
 {name:'Mercedes 300 SLR',year:1955,color:'#b6b9b2',dark:'#737b78',type:'The silver adventurer',shape:'silver',pace:1.04,grip:.87,note:'A Mille Miglia winner · Inspired by the legendary 1955 racer.'},
 {name:'Alfa Romeo 6C 1750',year:1930,color:'#8d2a23',dark:'#55221d',type:'The charming pioneer',shape:'vintage',pace:.87,grip:1.12,note:'A Mille Miglia winner · The 1930 6C 1750 Gran Sport.'},
 {name:'Porsche 356',year:1955,color:'#d4c7a3',dark:'#9c8e6c',type:'The easygoing explorer',shape:'round',pace:.9,grip:1.17,note:'A period classic · Inspired by the 356 family of road racers.'}
];
export const STAGES = [
 {name:'Brescia → Verona',short:'Lakeside',region:'LAKE GARDA · NORTHERN ITALY',desc:'Lakeside curves, cypress trees, and a very good place to begin.',segments:1550,curve:.65,hills:100,seed:2,palette:['#d9dbbf','#789091','#54745c','#b8aa68'],target:82},
 {name:'Verona → Ferrara',short:'Countryside',region:'THE PO VALLEY · NORTHERN ITALY',desc:'Open country, golden fields, and little villages along the way.',segments:1750,curve:.8,hills:60,seed:7,palette:['#e1d9b6','#94a08a','#6c7d53','#c1ad67'],target:92},
 {name:'Rome → Siena',short:'Tuscan hills',region:'VAL D’ORCIA · CENTRAL ITALY',desc:'A ribbon of road through rolling hills and sunlit stone towns.',segments:1900,curve:1.2,hills:210,seed:11,palette:['#e3d6b8','#9a9e71','#6a7952','#b7a15c'],target:103},
 {name:'Florence → Brescia',short:'Mountain pass',region:'THE APENNINES · THE ROAD HOME',desc:'Climb the winding passes. The grand finale is waiting for you.',segments:2100,curve:1.5,hills:320,seed:16,palette:['#d2dcd3','#839b92','#537367','#9ba16c'],target:118}
];
export const DIFFICULTIES = [
 {name:'Explorer',help:'A helping hand with steering. Perfect for a first drive.',speed:.77,assist:1.65,grip:1.2,auto:true},
 {name:'Touring',help:'A little guidance, a little more speed. Find your rhythm.',speed:.91,assist:.48,grip:1,auto:false},
 {name:'Racer',help:'You’re in charge. Faster corners and full manual steering.',speed:1,assist:0,grip:.85,auto:false}
];
export const WEATHER=[{name:'Sunshine',icon:'☀',grip:1},{name:'Rain',icon:'☂',grip:.78},{name:'Sunset',icon:'◒',grip:1}];
export const SEGMENT=200;
export function formatTime(t){if(!Number.isFinite(t))return '—';const m=Math.floor(t/60);return String(m).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0')}
export function buildTrack(stage){const s=STAGES[stage];return Array.from({length:s.segments},(_,i)=>{let envelope=Math.min(1,i/80,(s.segments-i)/100);return {curve:(Math.sin((i+s.seed*20)/125)*.7+Math.sin(i/48)*.23)*s.curve*envelope,y:Math.sin(i/150)*s.hills+Math.sin(i/57)*s.hills*.25}})}
export function stepPhysics(state,input,settings,dt,track){const d=DIFFICULTIES[settings.difficulty],c=CARS[settings.car],weather=WEATHER[settings.weather];const max=6800*d.speed*c.pace;const offroad=Math.abs(state.x)>1;const idx=Math.min(track.length-1,Math.floor(state.distance/SEGMENT));const curve=track[idx].curve;let speed=state.speed;const gas=input.gas||(d.auto&&!input.brake);speed+=((gas?max*.45:-max*.17)-(input.brake?max*.95:0)-(offroad?max*.4:0))*dt;speed=Math.max(0,Math.min(max,speed));const ratio=speed/max;const steering=input.steer*dt*1.8*(.25+ratio*.75)*c.grip*weather.grip*d.grip;let x=state.x+steering-curve*ratio*ratio*dt*.8/(weather.grip*d.grip);if(d.assist)x-=x*Math.min(.9,d.assist*dt)*(Math.abs(input.steer)<.1?1:.16);x=Math.max(-2,Math.min(2,x));return {...state,speed,x,distance:Math.min(track.length*SEGMENT,state.distance+speed*dt),elapsed:state.elapsed+dt,maxSpeed:Math.max(state.maxSpeed||0,speed),offroad:offroad?(state.offroad||0)+dt:(state.offroad||0)}}
