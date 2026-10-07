import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const match=html.match(/<script>([\s\S]*)<\\/script>/);
const script=match&&match[1];
if(!script) throw new Error('No se encontró el script principal');
const runnable=script.replace(/render\(\);tab\('config'\);\s*$/,'');
const storage={data:new Map(),getItem(k){return this.data.has(k)?this.data.get(k):null},setItem(k,v){this.data.set(k,String(v))}};
const context={console,localStorage:storage,document:{getElementById(){return null},querySelectorAll(){return []}},alert(){},confirm(){return true},setTimeout,clearTimeout};
vm.createContext(context);
vm.runInContext(runnable,context,{timeout:10000});

function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296};}
function runOne(n,seed){
  context.Math=Object.create(Math); context.Math.random=rng(seed);
  const players=Array.from({length:n},(_,i)=>({id:'p'+i,name:'P'+i,w:0,d:0,l:0,pf:0,pc:0}));
  context.S={name:'test',sys:'swiss',rounds:4,courts:99,tri:true,one:true,players,roundsData:[],started:true};
  const ids=players.map(p=>p.id);
  const violations={partnerRepeat:0,partnerToRival:0,rivalToPartner:0,rivalRepeat:0,scoreMix:0};
  for(let r=1;r<=4;r++){
    const g=vm.runInContext('swiss('+JSON.stringify(ids)+')',context,{timeout:10000});
    if(!g||!Array.isArray(g.games)) throw new Error('N='+n+' seed='+seed+' R='+r+': sin ronda');
    const seen=new Set();
    for(const game of g.games){
      for(const team of game.teams) for(const id of team){
        if(seen.has(id)) throw new Error('Jugador repetido N='+n+' seed='+seed+' R='+r);
        seen.add(id);
      }
      const ws=game.teams.flat().map(id=>players.find(p=>p.id===id).w||0);
      if(Math.max(...ws)-Math.min(...ws)>1) violations.scoreMix++;
    }
    if(seen.size!==n) throw new Error('Faltan jugadores N='+n+' seed='+seed+' R='+r);
    const key=(a,b)=>[a,b].sort().join('|');
    const priorTm=new Set(),priorRv=new Set();
    for(const rr of context.S.roundsData){
      for(const gg of rr.games){
        for(const t of gg.teams) for(let i=0;i<t.length;i++) for(let j=i+1;j<t.length;j++) priorTm.add(key(t[i],t[j]));
        for(const a of gg.teams[0]) for(const b of gg.teams[1]) priorRv.add(key(a,b));
      }
    }
    for(const game of g.games){
      const A=game.teams[0],B=game.teams[1];
      for(let i=0;i<A.length;i++)for(let j=i+1;j<A.length;j++){const q=key(A[i],A[j]);if(priorTm.has(q))violations.partnerRepeat++;if(priorRv.has(q))violations.rivalToPartner++;}
      for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const q=key(B[i],B[j]);if(priorTm.has(q))violations.partnerRepeat++;if(priorRv.has(q))violations.rivalToPartner++;}
      for(const a of A)for(const b of B){const q=key(a,b);if(priorTm.has(q))violations.partnerToRival++;if(priorRv.has(q))violations.rivalRepeat++;}
    }
    const result={a:13,b:(seed+r+n)%13};
    const round={number:r,games:g.games.map(x=>({teams:x.teams,result}))};
    context.S.roundsData.push(round);
    for(const game of round.games){
      const a=game.result.a,b=game.result.b;
      for(const id of game.teams[0]){const p=players.find(x=>x.id===id);p.pf+=a;p.pc+=b;}
      for(const id of game.teams[1]){const p=players.find(x=>x.id===id);p.pf+=b;p.pc+=a;}
      if(a>b) for(const id of game.teams[0])players.find(x=>x.id===id).w++;
      else if(b>a) for(const id of game.teams[1])players.find(x=>x.id===id).w++;
      else for(const id of game.teams.flat())players.find(x=>x.id===id).d++;
    }
  }
  return violations;
}

const sizes=[10,11,12,13,14,15,16,17,18,19,20,21,24,27,30,35,36,39,40,44,45,48,52,56,60,64,68,72,76,79];
const seeds=Number(process.env.SEEDS||30);
const total={partnerRepeat:0,partnerToRival:0,rivalToPartner:0,rivalRepeat:0,scoreMix:0};
const bySize={};
for(const n of sizes){
  bySize[n]={partnerRepeat:0,partnerToRival:0,rivalToPartner:0,rivalRepeat:0,scoreMix:0};
  for(let s=1;s<=seeds;s++){
    const v=runOne(n,s*100003+n);
    for(const k of Object.keys(total)){total[k]+=v[k];bySize[n][k]+=v[k];}
  }
}
console.log(JSON.stringify({sizes,seeds,total,bySize},null,2));
const bad=Object.values(bySize).some(v=>Object.values(v).some(x=>x!==0));
if(bad) process.exit(1);
