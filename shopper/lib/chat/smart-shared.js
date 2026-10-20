import {extractSlots,choosePlaybook,wantsPlan} from './planner.js';
import {detectLanguage,fold,pesos} from './normalize.js';
import {provenance} from './trust.js';

export const SMART_THRESHOLD=.75;
export const SMART_TIPS=['Check the actual pack before buying.','Confirm saved prices at the cashier.','Review suggested quantities for your household.','Tiyakin ang aktuwal na pack bago bumili.','Tiyakin ang na-save na presyo sa cashier.','Suriin ang mungkahing dami para sa inyong bahay.'];
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sameAssumptions=(a,b)=>a.people===b.people&&a.days===b.days&&a.budgetCentavos===b.budgetCentavos&&equal([...a.exclusions].sort(),[...b.exclusions].sort());
const tuples=lines=>lines.map(l=>String(l.id??l.sku)+'|'+(l.qty??l.quantity)).sort();
export function smartRequest(data){
 if(!exactKeys(data,['mode','consent','question','language','people','days','budgetCentavos','exclusions','includeFlagged'])||data.mode!=='smart'||data.consent!==true)throw Error('Explicit Smart mode consent is required.');
 if(typeof data.question!=='string'||!data.question.trim()||data.question.length>500)throw Error('Question must contain 1–500 characters.');
 if(!['auto','en','tl','taglish'].includes(data.language))throw Error('Invalid language.');
 for(const [k,max] of [['people',200],['days',31],['budgetCentavos',1000000000]])if(data[k]!=null&&(!Number.isSafeInteger(data[k])||data[k]<1||data[k]>max))throw Error('Invalid '+k+'.');
 if(!Array.isArray(data.exclusions)||data.exclusions.length>4||data.exclusions.some(x=>!['pork','seafood','vegetarian','alcohol'].includes(x))||typeof data.includeFlagged!=='boolean')throw Error('Invalid preferences.');
 const q=data.question.trim(),slots=extractSlots(q);
 if(slots.invalidBudget)throw Error('Invalid question budget.');
 for(const [field,explicit] of [['people','explicitPeople'],['days','explicitDays'],['budgetCentavos','explicitBudget']])if(slots[explicit]&&data[field]!=null&&data[field]!==slots[field])throw Error('Question and '+field+' disagree.');
 if(data.includeFlagged&&!/include flagged|include unusual prices/i.test(q))throw Error('Flagged prices require an explicit request.');
 return {mode:'smart',consent:true,question:q,language:data.language,people:slots.explicitPeople?slots.people:data.people??null,days:slots.explicitDays?slots.days:data.days??null,budgetCentavos:slots.explicitBudget?slots.budgetCentavos:data.budgetCentavos??null,exclusions:[...new Set([...slots.exclusions,...data.exclusions])].sort(),includeFlagged:data.includeFlagged};
}
export function smartRoute(question,offline,{enabled=false,forced=false,threshold=SMART_THRESHOLD}={}){
 if(!enabled)return {escalate:false,reason:'consent-off',threshold};
 if(/\b(dosage|diagnosis|cure|legal advice|weather forecast|system prompt)\b/i.test(question))return {escalate:false,reason:'outside-scope',threshold};
 if(forced)return {escalate:true,reason:'explicit-request',threshold};
 if((offline.confidence??0)<threshold)return {escalate:true,reason:'low-confidence',threshold};
 if(['PLAN','COMPARE','WHY'].includes(offline.intent)||/what (?:should|can) i buy|ano.*bibilhin|help.*plan/i.test(question))return {escalate:true,reason:'complex-question',threshold};
 const constraints=['budget','people','days','no pork','no seafood','vegetarian'].filter(x=>fold(question).includes(x));
 return {escalate:constraints.length>=2,reason:constraints.length>=2?'multiple-constraints':'offline-sufficient',threshold};
}
export const smartDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function trustedSmartPlan(engine,request,id,day=smartDay()){
 const book=engine.planner.books.find(b=>b.id===id);if(!book)throw Error('Unknown playbook.');
 const detected=choosePlaybook(request.question,engine.planner.books,day);if(detected&&detected.id!==id)throw Error('Playbook does not match the question.');
 const people=request.people??book.defaults.people,days=request.days??book.defaults.days;
 const diet={pork:'no pork',seafood:'no seafood',vegetarian:'vegetarian',alcohol:'no alcohol'};
 const question=book.triggers[0]+` for ${people} people ${days} days`+(request.budgetCentavos==null?'':' budget '+request.budgetCentavos/100)+' '+request.exclusions.map(x=>diet[x]).join(' ')+(request.includeFlagged?' include flagged':'');
 return engine.planner.plan(question,{language:request.language,day});
}
export function smartWire(reply,version){
 const p=reply.plan;return {snapshotVersion:version,playbookId:p?.id??null,summary:p?.summary||'Items from the saved catalog.',assumptions:p?{people:p.assumptions.people,days:p.assumptions.days,budgetCentavos:p.assumptions.budgetCentavos,exclusions:[...p.assumptions.exclusions].sort()}:{people:null,days:null,budgetCentavos:null,exclusions:[]},lines:(p?.lines||reply.cards||[]).map(l=>({id:String(l.sku),qty:l.quantity??1})),notes:[]};
}
export function verifySmart(candidate,engine,request,{version,day=smartDay(),ledger=null}={}){
 if(!exactKeys(candidate,['snapshotVersion','playbookId','summary','assumptions','lines','notes'])||Object.keys(candidate).length!==6||candidate.snapshotVersion!==version||typeof candidate.summary!=='string'||candidate.summary.length>400||!Array.isArray(candidate.lines)||candidate.lines.length>30||!Array.isArray(candidate.notes)||candidate.notes.length>6)throw Error('Invalid Smart answer schema/version.');
 const assumptions=candidate.assumptions;
 if(!exactKeys(assumptions,['people','days','budgetCentavos','exclusions'])||!Array.isArray(assumptions.exclusions))throw Error('Invalid assumptions.');
 const ids=new Set();let total=0;
 for(const line of candidate.lines){
  if(!exactKeys(line,['id','qty'])||typeof line.id!=='string'||!Number.isSafeInteger(line.qty)||line.qty<1||line.qty>9999||ids.has(line.id))throw Error('Invalid or duplicate line.');ids.add(line.id);
  const product=engine.byId.get(line.id);if(!product||!Number.isSafeInteger(product.priceCentavos)||product.priceCentavos<1)throw Error('Unknown item or price.');
  if(product.anomalyFlags?.length&&!request.includeFlagged)throw Error('Flagged price excluded.');
  const allowed=engine.planner.candidates({terms:[line.id],substitutes:[],concept:'item',tags:['nonfood']},{exclusions:request.exclusions},request.includeFlagged).choices;
  if(!allowed.some(p=>p.sku===line.id))throw Error('Dietary constraint violated.');
  if(ledger&&!ledger.has(line.id+'|'+line.qty))throw Error('Quantity was not returned by a tool.');
  total+=product.priceCentavos*line.qty;
 }
 if(!Number.isSafeInteger(total)||request.budgetCentavos!=null&&total>request.budgetCentavos)throw Error('Budget or arithmetic bound exceeded.');
 const lang=request.language==='auto'?detectLanguage(request.question):request.language,notes=candidate.notes.filter(n=>typeof n==='string'&&SMART_TIPS.includes(n));
 if(candidate.playbookId!=null){
  const reply=trustedSmartPlan(engine,request,candidate.playbookId,day),p=reply.plan;
  const expected={people:p.assumptions.people,days:p.assumptions.days,budgetCentavos:p.assumptions.budgetCentavos,exclusions:[...p.assumptions.exclusions].sort()};
  if(!sameAssumptions(assumptions,expected))throw Error('Headcount/day/budget assumptions changed.');
  const variant=p.variants.find(v=>equal(tuples(v.lines),tuples(candidate.lines)));if(!variant)throw Error('Quantities do not match computed scaling.');
  p.active=variant.id;p.lines=variant.lines;p.totalCentavos=variant.totalCentavos;p.remainingCentavos=variant.remainingCentavos;p.trimmed=variant.trimmed;p.context.variant=variant.id;
  reply.cards=p.lines.map(l=>l.product);reply.sourceLabel='Planned from saved prices';reply.generalTips=notes;reply.smartVerified=true;return reply;
 }
 if(choosePlaybook(request.question,engine.planner.books,day)||wantsPlan(request.question,null))throw Error('A planning question needs a verified plan.');
 const expected={people:request.people,days:request.days,budgetCentavos:request.budgetCentavos,exclusions:request.exclusions};if(!sameAssumptions(assumptions,expected))throw Error('Assumptions changed.');
 if(candidate.lines.some(l=>l.qty!==1))throw Error('Catalog comparisons use one selling unit, not invented servings.');
 const cards=candidate.lines.map(l=>engine.byId.get(l.id));if(!cards.length)throw Error('No verified catalog result.');
 return {intent:'SMART_CATALOG',lang,text:(lang==='en'?'Verified saved items. Computed total: ':'Beripikadong na-save na items. Kabuuang kuwenta: ')+pesos(total)+'\n'+provenance(lang,engine.config.metadata?.effectiveDate),cards,table:{kind:'plan',rows:cards.map(p=>({id:p.sku,name:p.name,quantity:1,priceCentavos:p.priceCentavos,subtotalCentavos:p.priceCentavos})),totalCentavos:total},quickReplies:['Cheapest rice','Noche Buena plan','Weekly budget groceries'],actions:[],sourceLabel:'From saved catalog',generalTips:notes,smartVerified:true,context:{ids:cards.map(p=>p.sku),lastQuery:request.question}};
}
