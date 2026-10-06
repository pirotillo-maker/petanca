const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const js=html.substring(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
const el=()=>new Proxy({classList:{add(){},remove(){}},style:{}},{get:(o,p)=>p in o?o[p]:p==='value'?'':p==='checked'?false:p==='classList'?o.classList:p==='querySelectorAll'?()=>[]:()=>{}});
const ctx={console,Math,Date,Set,Map,JSON,Promise,parseInt,parseFloat,isNaN,Infinity,NaN,alert(){},confirm(){return true},localStorage:{getItem(){return null},setItem(){}},document:{querySelectorAll(){return []},getElementById(){return el()}}};
vm.createContext(ctx);vm.runInContext(js,ctx,{timeout:5000});
ctx.Math.random=(()=>{let x=(40040>>>0)||1;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}})();
vm.runInContext("S={name:'stress',sys:'swiss',rounds:4,courts:30,tri:true,one:true,players:Array.from({length:40},(_,i)=>({id:'p'+i,name:'P'+i,w:0,d:0,l:0,pf:0,pc:0})),roundsData:[],started:true};",ctx);
const all=[];
for(let r=1;r<=4;r++){
 const state=vm.runInContext('S',ctx);
 const before={}; for(const p of state.players){(before[p.w]??=[]).push(p.id)}
 const out=vm.runInContext(r===1?'firstSwiss(S.players.map(p=>p.id))':'swiss(S.players.map(p=>p.id))',ctx,{timeout:12000});
 if(!out||!out.games)throw Error('generation failed R'+r);
 const prior=new Set();
 const priorRounds=new Map();
 for(const rr of state.roundsData)for(const g of rr.games)for(const t of g.teams)for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++){const k=[t[i],t[j]].sort().join('|');prior.add(k);if(!priorRounds.has(k))priorRounds.set(k,[]);priorRounds.get(k).push(rr.number)}
 const repsByGroup={}; let total=0;
 for(const g of out.games)for(const t of g.teams)for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++){const k=[t[i],t[j]].sort().join('|');if(prior.has(k)){total++; const w=state.players.find(p=>p.id===t[i]).w; repsByGroup[w]=(repsByGroup[w]||0)+1;}}
 all.push({round:r,before:Object.fromEntries(Object.entries(before).map(([w,a])=>[w,a.length])),games:out.games.map(g=>g.teams.map(t=>t.map(id=>id))),repeats:total,repeatsByWinGroup:repsByGroup});
 state.roundsData.push({number:r,games:out.games});
 for(const g of out.games){const a=Math.floor(ctx.Math.random()*14),b=Math.floor(ctx.Math.random()*14);g.result={a,b};}
 vm.runInContext("S.players.forEach(p=>{p.w=0;p.pf=0;p.pc=0;p.d=0;p.l=0});for(const rr of S.roundsData)for(const g of rr.games){const a=+g.result.a,b=+g.result.b;g.teams[0].forEach(id=>{let p=S.players.find(x=>x.id===id);p.pf+=a;p.pc+=b});g.teams[1].forEach(id=>{let p=S.players.find(x=>x.id===id);p.pf+=b;p.pc+=a});if(a>b){g.teams[0].forEach(id=>S.players.find(x=>x.id===id).w++);g.teams[1].forEach(id=>S.players.find(x=>x.id===id).l++)}else if(b>a){g.teams[1].forEach(id=>S.players.find(x=>x.id===id).w++);g.teams[0].forEach(id=>S.players.find(x=>x.id===id).l++)}else g.teams.flat().forEach(id=>S.players.find(x=>x.id===id).d++)}",ctx);
}
console.log(JSON.stringify(all));
