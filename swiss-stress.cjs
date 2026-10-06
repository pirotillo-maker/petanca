const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const js=html.substring(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
const el=()=>new Proxy({classList:{add(){},remove(){}},style:{}},{get:(o,p)=>p in o?o[p]:p==='value'?'':p==='checked'?false:p==='classList'?o.classList:p==='querySelectorAll'?()=>[]:()=>{}});
const ctx={console,Math,Date,Set,Map,JSON,Promise,parseInt,parseFloat,isNaN,Infinity,NaN,alert(){},confirm(){return true},localStorage:{getItem(){return null},setItem(){}},document:{querySelectorAll(){return []},getElementById(){return el()}}};
vm.createContext(ctx); vm.runInContext(js,ctx,{timeout:2000});
function run(n,seed){
  ctx.Math.random=(()=>{let x=(seed>>>0)||1;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}})();
  vm.runInContext("S={name:'test',sys:'swiss',rounds:4,courts:20,tri:true,one:true,players:Array.from({length:"+n+"},(_,i)=>({id:'p'+i,name:'P'+i,w:0,d:0,l:0,pf:0,pc:0})),roundsData:[],started:true}; vr=0;",ctx);
  let violations=0,genFails=0;
  for(let r=1;r<=4;r++){
    const out=vm.runInContext(r===1?'firstSwiss(S.players.map(p=>p.id))':'swiss(S.players.map(p=>p.id))',ctx,{timeout:5000});
    if(!out||!out.games){genFails++;break}
    const seen=new Set();
    for(const g of out.games) for(const t of g.teams) for(const id of t){if(seen.has(id)) throw new Error('duplicate player');seen.add(id)}
    if(seen.size!==n) throw new Error('missing player');
    const prior=new Set();
    const state=vm.runInContext('S',ctx);
    for(const rr of state.roundsData) for(const g of rr.games) for(const t of g.teams) for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++) prior.add([t[i],t[j]].sort().join('|'));
    for(const g of out.games) for(const t of g.teams) for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++) if(prior.has([t[i],t[j]].sort().join('|'))) violations++;
    state.roundsData.push({number:r,games:out.games});
    for(const g of out.games){const a=Math.floor(Math.random()*14),b=Math.floor(Math.random()*14);g.result={a,b};}
    vm.runInContext("S.players.forEach(p=>Object.assign(p,{w:0,d:0,l:0,pf:0,pc:0}));for(const rr of S.roundsData)for(const g of rr.games){const a=+g.result.a,b=+g.result.b;g.teams[0].forEach(id=>{const p=S.players.find(x=>x.id===id);p.pf+=a;p.pc+=b});g.teams[1].forEach(id=>{const p=S.players.find(x=>x.id===id);p.pf+=b;p.pc+=a});if(a>b){g.teams[0].forEach(id=>S.players.find(x=>x.id===id).w++);g.teams[1].forEach(id=>S.players.find(x=>x.id===id).l++)}else if(b>a){g.teams[1].forEach(id=>S.players.find(x=>x.id===id).w++);g.teams[0].forEach(id=>S.players.find(x=>x.id===id).l++)}else g.teams.flat().forEach(id=>S.players.find(x=>x.id===id).d++);}",ctx);
  }
  return {violations,genFails};
}
let total=0,failed=0,byN=[];
for(let n=10;n<=79;n++){let v=0,f=0;for(let s=1;s<=20;s++){const x=run(n,n*1000+s);v+=x.violations;f+=x.genFails;}total+=v;failed+=f;if(v||f)byN.push({n,v,f});}
console.log(JSON.stringify({totalPartnerRepeatEvents:total,generationFailures:failed,problemSizes:byN}));
