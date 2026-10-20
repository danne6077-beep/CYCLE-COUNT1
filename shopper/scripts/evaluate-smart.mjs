import fs from 'node:fs';import path from 'node:path';
import {ChatEngine} from '../lib/chat/engine.js';import {hydrateSnapshot} from '../lib/chat/snapshot.js';
import {golden,heldout,books} from '../tests/planner-fixtures.js';
import {smartRoute,smartRequest,smartWire,verifySmart} from '../lib/chat/smart-shared.js';
const root=path.resolve(import.meta.dirname,'..'),snapshot=JSON.parse(fs.readFileSync(path.join(root,'chat-data/catalog.json'))),aliases=JSON.parse(fs.readFileSync(path.join(root,'chat-data/aliases.json'))),engine=new ChatEngine(hydrateSnapshot(snapshot),aliases,{metadata:snapshot,playbooks:books}),day='2026-10-19';
const report={method:'Offline measured; Smart-only/hybrid are deterministic contract replays, not live model accuracy or latency.',providerCalls:0,liveSmart:'not measured: no configured local Anthropic key or durable limiter credentials; production not deployed',humanReviewedSmart:'not measured: no live answers to review',threshold:.75,sets:{}};
for(const [name,fixtures] of [['golden',golden],['heldout',heldout]]){
 const buckets={language:{},intent:{}},rates=Object.fromEntries([.5,.65,.75,.85].map(t=>[t,0]));let offlineCorrect=0,replayCorrect=0,rejected=0,acceptedFakeIds=0,mathErrors=0;
 for(const fixture of fixtures){engine.focus={};const offline=engine.respond(fixture.question,{day}),ok=offline.plan?.id===fixture.expected.playbook;if(ok)offlineCorrect++;
  for(const threshold of Object.keys(rates))if(smartRoute(fixture.question,offline,{enabled:true,threshold:Number(threshold)}).escalate)rates[threshold]++;
  const a=offline.plan?.assumptions;if(!a)continue;const request=smartRequest({mode:'smart',consent:true,question:fixture.question,language:fixture.lang,people:a.people,days:a.days,budgetCentavos:a.budgetCentavos,exclusions:a.exclusions,includeFlagged:false});
  const wire=smartWire(offline,snapshot.version),verified=verifySmart(wire,engine,request,{version:snapshot.version,day}),correct=verified.plan.id===fixture.expected.playbook;if(correct)replayCorrect++;
  if(verified.plan.totalCentavos!==verified.plan.lines.reduce((n,l)=>n+l.priceCentavos*l.quantity,0))mathErrors++;
  const tampered=structuredClone(wire);tampered.lines=[{id:'invented-id',qty:1}];try{verifySmart(tampered,engine,request,{version:snapshot.version,day});acceptedFakeIds++;}catch{rejected++;}
  for(const [kind,key] of [['language',fixture.lang],['intent',fixture.expected.playbook]]){const b=buckets[kind][key]||={total:0,offlineCorrect:0,replayCorrect:0};b.total++;if(ok)b.offlineCorrect++;if(correct)b.replayCorrect++;}
 }
 report.sets[name]={total:fixtures.length,offlineCorrect,smartContractReplayCorrect:replayCorrect,hybridContractReplayCorrect:replayCorrect,routerEscalationsByThreshold:rates,adversarialUnknownIdRejections:rejected,acceptedFakeIds,arithmeticErrors:mathErrors,buckets};
 if(acceptedFakeIds||mathErrors||offlineCorrect!==fixtures.length||replayCorrect!==fixtures.length)process.exitCode=1;
}
report.thresholdSelection='All complex fixtures escalate at all four thresholds, so this set cannot identify an optimal confidence cutoff. Retained 0.75 as a conservative tie policy; live held-out gains are not established.';
report.latency='Live p50/p95 not measured. Mock replay timing is not provider latency.';
report.costPer1000='Illustrative only: 3000 input + 768 output tokens at published rates gives Haiku $0.684/1000 single calls; Sonnet $13.68/1000 single calls. Multiply by measured calls/request and actual usage; live usage not measured. Retry/tool overhead can increase cost.';
fs.mkdirSync(path.join(root,'../qa/shopper'),{recursive:true});fs.writeFileSync(path.join(root,'../qa/shopper/smart-eval.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({method:report.method,threshold:report.threshold,...Object.fromEntries(Object.entries(report.sets).map(([k,v])=>[k,{total:v.total,offline:v.offlineCorrect,contractReplay:v.smartContractReplayCorrect,acceptedFakeIds:v.acceptedFakeIds,arithmeticErrors:v.arithmeticErrors}]))},null,2));
