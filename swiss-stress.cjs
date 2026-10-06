const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const js=html.substring(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
const el=()=>new Proxy({classList:{add(){},remove(){}},style:{}},{get:(o,p)=>p in o?o[p]:p==='value'?'':p==='checked'?false:p==='classList'?o.classList:p==='querySelectorAll'?()=>[]:()=>{}});
const ctx={console,Math,Date,Set,Map,JSON,Promise,parseInt,parseFloat,isNaN,Infinity,NaN,alert(){},confirm(){return true},localStorage:{getItem(){return null},setItem(){}},document:{querySelectorAll(){return []},getElementById(){return el()}}};
vm.createContext(ctx);vm.runInContext(js,ctx,{timeout:5000});
function one(n,seed){
  ctx.Math.random=(()=>{let x=(seed>>>0)||1;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}})();
  vm.runInContext("S={name:'stress',sys:'swiss',rounds:4,courts:30,tri:true,one:true,players:Array.from({length:"+n+"},(_,i)=>({id:'p'+i,name:'P'+i,w:0,d:0,l:0,pf:0,pc:0})),roundsData:[],started:true};",ctx);
  let repeats=0;
  for(let r=1;r<=4;r++){
    const out=vm.runInContext(r===1?'firstSwiss(S.players.map(p=>p.id))':'swiss(S.players.map(p=>p.id))',ctx,{timeout:8000});
    if(!out||!out.games)throw Error('generation failed R'+r);
    const prior=new Set(),state=vm.runInContext('S',ctx);
    for(const rr of state.roundsData)for(const g of rr.games)for(const t of g.teams)for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++)prior.add([t[i],t[j]].sort().join('|'));
    const seen=new Set();
    for(const g of out.games)for(const t of g.teams)for(const id of t){if(seen.has(id))throw Error('duplicate');seen.add(id)}
    if(seen.size!==n)throw Error('missing');
    for(const g of out.games)for(const t of g.teams)for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++)if(prior.has([t[i],t[j]].sort().join('|')))repeats++;
    state.roundsData.push({number:r,games:out.games});
    for(const g of out.games){const a=Math.floor(ctx.Math.random()*14),b=Math.floor(ctx.Math.random()*14);g.result={a,b};}
    vm.runInContext("S.players.forEach(p=>{p.w=0;p.pf=0;p.pc=0;p.d=0;p.l=0});for(const rr of S.roundsData)for(const g of rr.games){const a=+g.result.a,b=+g.result.b;g.teams[0].forEach(id=>{let p=S.players.find(x=>x.id===id);p.pf+=a;p.pc+=b});g.teams[1].forEach(id=>{let p=S.players.find(x=>x.id===id);p.pf+=b;p.pc+=a});if(a>b){g.teams[0].forEach(id=>S.players.find(x=>x.id===id).w++);g.teams[1].forEach(id=>S.players.find(x=>x.id===id).l++)}else if(b>a){g.teams[1].forEach(id=>S.players.find(x=>x.id===id).w++);g.teams[0].forEach(id=>S.players.find(x=>x.id===id).l++)}else g.teams.flat().forEach(id=>S.players.find(x=>x.id===id).d++)}",ctx);
  }
  return repeats;
}
let total=0,max=0,fail=0,rows=[];
const cases=[10,15,20,25,27,30,35,40,45,50,60,70,79];
for(const n of cases){try{const v=one(n,10000+n);total+=v;max=Math.max(max,v);rows.push([n,v])}catch(e){fail++;rows.push([n,'FAIL '+e.message])}}
for(const n of [35,40,45])for(let s=1;s<=2;s++){try{const v=one(n,50000+n*100+s);total+=v;max=Math.max(max,v);rows.push([n+'#'+s,v])}catch(e){fail++;rows.push([n+'#'+s,'FAIL '+e.message])}}
console.log(JSON.stringify({totalPartnerRepeats:total,maxInOneChampionship:max,generationFailures:fail,problems:rows}));