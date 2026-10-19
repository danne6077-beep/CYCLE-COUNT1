import {fold,normalizeNumbers,detectLanguage,distance,normalizeProduct,parseSize,pesos} from './normalize.js';
const stop=new Set(('what whats is are the a an of here there can could would you me my please show list all items item products product cheapest cheap lowest most expensive highest price prices how much cost costs available have do does we they compare versus vs best value per under below less than above over between and to at maximum max minimum min php pesos peso p for with in stock where aisle location find suggest recommend alternatives alternative cheaper more than any anything else about kg kilo kilos g ml l pcs pack size top first second third fourth fifth ang mga ano anong ba po yung iyong iyong mga kay para sa si ni nang ng na meron mayroon kayong kayo magkano presyo halaga pinakamura pinakamurang mura murang mas pinakamahal mahal alin dito doon paki pakita ipakita mabibili bibilhin mabili may ako ko mo naman lang sana lahat wala isang dalawang tatlong weekly week linggo pang bakit today ngayon').split(/\s+/));
const escapeRE=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const stem=s=>s.length>4?s.replace(/(?:es|s)$/,''):s;
const choose=(lang,en,tl,taglish=tl)=>lang==='en'?en:lang==='tl'?tl:taglish;
const initial=['Pinakamurang bigas','Cheapest cooking oil','Magkano ang itlog?','May ₱500 ako, ano mabibili?','Compare Coke vs Pepsi','Ano ang promo ngayon?'];
const serious=new Set(['CLEAR_BASKET','RESET','ERROR']);
for(const word of 'add remove idagdag lagay ilagay isama tanggalin alisin mo yan iyon iyan pa first second third fourth fifth una pangalawa pangatlo pang may mabibili bibilhin saan nasaan hanapin ikumpara kumpara mas sa kanya kami tayo para ngayon bagong usapan need needs want looking'.split(' '))stop.add(word);
export function classify(raw,focus={}){
 const text=normalizeNumbers(raw),n=fold(text),basket=/\b(basket|cart|badyet ko|budget ko|my budget|matitira|remaining|balance|kasya ba|how is my budget|what should i remove)\b/.test(n);
 let intent='UNKNOWN';
 if(/^(reset|start over|new chat|bagong usapan)$/.test(n))intent='RESET';
 else if(/\b(clear|empty|ubusin|limasin|burahin|tanggalin lahat|alisin lahat)\b/.test(n)&&/basket|cart/.test(n))intent='CLEAR_BASKET';
 else if(/^(add|idagdag|lagay|ilagay|isama|remove|tanggalin|alisin)\b/.test(n))intent='BASKET_ACTION';
 else if(basket)intent='BASKET_QUERY';
 else if(/\b(help|tulong|magagawa|kaya mong|what can you|paano gamitin)\b/.test(n))intent='HELP';
 else if(/^(hi|hello|hey|kumusta|kamusta|salamat|thanks|thank you|bye|goodbye|sino ka|who are you)(\s|$)/.test(n))intent='SMALLTALK';
 else if(/\b(where|saan|nasaan|aisle|lokasyon|location)\b/.test(n))intent='LOCATION';
 else if(/\b(promo|sale|discount|deal|tawad|bawas)\b/.test(n))intent='PROMO';
 else if(/\b(compare|kumpara|ikumpara|versus|vs|difference|alin mas|mas mura ba|mas sulit ba)\b/.test(n))intent='COMPARE';
 else if(/\b(best value|unit price|per kilo|per kg|per liter|per piece|pinakasulit|mas sulit|sulit)\b/.test(n))intent='BEST_VALUE';
 else if(/\b(alternative|alternatives|substitute|pamalit|kapalit)\b/.test(n))intent='ALTERNATIVES';
 else if(/\b(breakfast|dinner|lunch|hapunan|tanghalian|agahan|almusal|ulam|recipe|adobo|sinigang|spaghetti|baon|handaan)\b/.test(n))intent='MEAL_HELP';
 else if(/\b(may|budget|pera|with)\s*(?:₱|php\s*|p\s*)?\d|₱\s*\d.*(?:mabibili|bibilhin|plan|week|linggo)|\d+\s*(?:pesos|peso).*(?:plan|buy|mabibili)/.test(n)&&!/\b(under|below|between|max|lalagpas|hanggang)\b/.test(n))intent='BUDGET_PLAN';
 else if(/\b(under|below|between|less than|max|maximum|hanggang|lalagpas|mababa sa)\b/.test(n)&&/\d/.test(n))intent='UNDER_BUDGET';
 else if(/\b(cheapest|cheaper|lowest|affordable|pinakamura|pinakamurang|mura|murang|tipid|abot kaya)\b/.test(n))intent='CHEAPEST';
 else if(/\b(expensive|priciest|highest|pinakamahal|mahal|mamahalin)\b/.test(n))intent='MOST_EXPENSIVE';
 else if(/\b(how much|magkano|price|presyo|halaga|cost)\b/.test(n))intent='PRICE_OF';
 else if(/\b(available|availability|do you have|is there|meron|mayroon|may.*ba)\b/.test(n))intent='AVAILABILITY';
 else if(/\b(show|list|ipakita|pakita|ano ang|anong mga|ano mga)\b/.test(n))intent='LIST_CATEGORY';
 else if(/^(more|next|ano pa|iba pa|what else|eh sa iba)$/.test(n)&&focus.lastQuery)intent='MORE';
 const currency=n.match(/(?:₱|php\s*|\bp\s*)(\d+(?:\.\d{1,2})?)\b/),range=n.match(/between\s+(\d+(?:\.\d+)?)\s+(?:and|at)\s+(\d+(?:\.\d+)?)/),limit=n.match(/(?:under|below|max(?:imum)?|than|hanggang|lalagpas ng|sa)\s*₱?\s*(\d+(?:\.\d+)?)/),budget=n.match(/(?:may|budget|pera|with)\s*(?:₱|php\s*|p\s*)?(\d+(?:\.\d+)?)/)||n.match(/(\d+(?:\.\d+)?)\s*(?:pesos|peso)/);
 const amount=range?+range[2]:+(currency?.[1]??(intent==='BUDGET_PLAN'?budget?.[1]:limit?.[1]??budget?.[1])??NaN),count=n.match(/\btop\s+(\d+)|\b(\d+)\s+(?:pinakamura|cheapest|items|products)/);
 return {intent,text:n,amount:Number.isFinite(amount)?Math.round(amount*100):null,min:range?Math.round(+range[1]*100):null,count:Math.min(20,Math.max(1,+(count?.[1]||count?.[2]||5))),invalidAmount:/-\s*\d/.test(raw)||amount<=0||amount>10000000,requestedSize:parseSize(n),strictMax:/\b(under|below|less than)\b/.test(n)};
}
export class ChatEngine{
 constructor(products,aliases={},jokes={},config={}){
  this.aliases=aliases;this.jokes=jokes;this.config=config;this.focus={};this.mentions=0;this.previousJoke='';this.turns=[];
  this.rules=Object.entries(aliases).flatMap(([key,values])=>values.map(value=>({key,phrase:fold(value)}))).sort((a,b)=>b.phrase.length-a.phrase.length);
  this.products=products.map(normalizeProduct);this.byId=new Map(this.products.map(p=>[p.id,p]));this.postings=new Map();
  for(const p of this.products){let extra=[];for(const rule of this.rules)if((' '+p.searchText+' ').includes(' '+rule.phrase+' '))extra.push(rule.key);p.tokens=[...new Set((p.searchText+' '+extra.join(' ')).split(' ').map(stem))];for(const token of p.tokens){if(!this.postings.has(token))this.postings.set(token,[]);this.postings.get(token).push(p.id);}}
  this.vocabulary=[...new Set([...Object.values(aliases).flat().map(fold),...this.postings.keys()])].filter(t=>t.length>=4&&!t.includes(' '));
 }
 canonical(text){let n=' '+fold(text)+' ';for(const {phrase,key} of this.rules)n=n.replace(new RegExp('(^| )'+escapeRE(phrase)+'(?= |$)','g'),'$1'+key+' ');return n.trim().replace(/\s+/g,' ');}
 terms(text){return this.canonical(text).split(' ').filter(t=>!stop.has(t)&&!/^\d+(?:\.\d+)?(?:kg|kilo|g|ml|l|pcs?|s)?$/.test(t)&&!/^₱/.test(t)&&!['julian','julien','julyan','hulyan','julz','jul','sino','who','new','ngayon'].includes(t)).map(stem);}
 search(text,{lastQuery=false}={}){
  let terms=this.terms(text),corrections=[];
  for(let i=0;i<terms.length;i++)if(!this.postings.has(terms[i])&&terms[i].length>=4){let best=null,bestD=3;for(const word of this.vocabulary){if(Math.abs(word.length-terms[i].length)>2)continue;const d=distance(terms[i],word);if(d<bestD){best=word;bestD=d;}if(!d)break;}const threshold=terms[i].length>=7?2:1;if(best&&bestD<=threshold){corrections.push({from:terms[i],to:best,confidence:1-bestD/Math.max(best.length,terms[i].length)});terms[i]=this.canonical(best);}}
  terms=[...new Set(terms.flatMap(t=>t.split(' ')).map(stem))];
  const topic=terms.includes('rice')?'rice':terms.includes('oil')?'oil':terms.includes('egg')?'egg':null;
  let candidates=null;for(const term of terms){let ids=this.postings.get(term);if(!ids&&term.length>=4){ids=[...this.postings].filter(([token])=>token.startsWith(term)).flatMap(([,values])=>values);}const set=new Set(ids||[]);candidates=candidates===null?set:new Set([...candidates].filter(id=>set.has(id)));}
  let rows=candidates===null?[]:[...candidates].map(id=>this.byId.get(id));
  if(topic==='rice')rows=rows.filter(p=>p.category==='STAPLE'&&/rice|bigas/.test(p.searchText));
  if(topic==='oil')rows=rows.filter(p=>p.category==='COOKING ESSENTIALS');
  if(topic==='egg')rows=rows.filter(p=>/eggs?$/.test(fold(p.subcategory))&&p.department==='FRESH & STAPLE');
  const score=p=>terms.reduce((sum,term)=>sum+(p.tokens.includes(term)?Math.log(1+this.products.length/(this.postings.get(term)?.length||1)):0),0)+(fold(p.name)===fold(text)?10:0);
  rows.sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name)||a.sku.localeCompare(b.sku));
  return {rows,terms,topic,corrections,text};
 }
 restore(focus){if(focus&&Array.isArray(focus.ids))this.focus={...focus,ids:focus.ids.filter(id=>this.byId.has(id))};}
 respond(raw,{language='auto',julian=true,basket=[],budget=null,day='2026-10-19'}={}){
  raw=String(raw??'').slice(0,500).trim();const lang=language==='auto'?detectLanguage(raw):language;
  const q=classify(raw,this.focus),reply={text:'',lang,cards:[],table:null,actions:[],quickReplies:initial,confidence:1,intent:q.intent,followUpHint:'',context:null};
  const say=(en,tl,mixed)=>choose(lang,en,tl,mixed),source=say('Based on the saved Hypermart catalog. Price date unavailable.','Batay sa na-save na Hypermart catalog. Walang petsa ng presyo.','Saved Hypermart catalog ito; walang price date.');
  let found=this.search(q.text),rows=found.rows,hasFocus=(this.focus.ids||[]).length>0;
  if(q.requestedSize&&!['BUDGET_PLAN','MEAL_HELP','BASKET_ACTION','BASKET_QUERY'].includes(q.intent))rows=rows.filter(p=>p.parsedSize?.baseUnit===q.requestedSize.baseUnit&&p.parsedSize.baseValue===q.requestedSize.baseValue);
  const ordinal=q.text.match(/\b(first|second|third|fourth|fifth|una|pangalawa|pangatlo|pang apat|pang lima|#?\d+)\b/),order={first:0,una:0,second:1,pangalawa:1,third:2,pangatlo:2,fourth:3,'pang apat':3,fifth:4,'pang lima':4};
  const reference=/\b(it|that one|this one|yan|iyon|iyan|yung|the second|pangalawa|una|pangatlo|how about|mas mura pa|cheaper|ano pa|what else|eh sa iba)\b/.test(q.text);
  const refIndex=ordinal?(order[ordinal[1]]??Math.max(0,+ordinal[1]-1)):0;
  if(reference&&hasFocus&&!rows.length){rows=(this.focus.ids||[]).map(id=>this.byId.get(id)).filter(Boolean);found={...found,topic:this.focus.topic};if(q.intent==='CHEAPEST'&&/pa|cheaper/.test(q.text)){found=this.search(this.focus.lastQuery||'');const cap=this.byId.get(this.focus.ids[refIndex])?.priceCentavos;rows=found.rows.filter(p=>p.priceCentavos!=null&&p.priceCentavos<(cap??Infinity));}else if(q.requestedSize&&this.focus.lastQuery){found=this.search(this.focus.lastQuery);rows=found.rows.filter(p=>p.parsedSize?.baseUnit===q.requestedSize.baseUnit&&p.parsedSize.baseValue===q.requestedSize.baseValue);q.intent='LIST_CATEGORY';}}
  if(q.intent==='CHEAPEST'&&!found.terms.length&&hasFocus&&!reference){found=this.search(this.focus.lastQuery||'');rows=found.rows;}
  reply.intent=q.intent;
  if(q.intent==='UNKNOWN'&&rows.length)q.intent=reply.intent='LIST_CATEGORY';
  if(q.intent==='MORE'){found=this.search(this.focus.lastQuery);rows=found.rows;reply.intent='LIST_CATEGORY';}
  if(q.intent==='RESET'){this.focus={};this.turns=[];reply.text=say('New conversation. What would you like to find?','Bagong usapan po. Ano ang hahanapin natin?');return reply;}
  if(!raw||!/[\p{L}\p{N}]/u.test(raw)){reply.text=say('Ask a product or budget question, such as “cheapest rice”.','Magtanong po tungkol sa produkto o budget, gaya ng “pinakamurang bigas”.');return reply;}
  if(q.intent==='SMALLTALK')reply.text=say('Hello! I’m FUJI, your offline Hypermart catalog assistant. Ask about prices, your basket or a shopping budget.','Kumusta po! Si FUJI ito, ang offline na katulong mo sa Hypermart catalog. Puwedeng magtanong ng presyo, basket o budget.','Hi! FUJI here, ang offline Hypermart shopping buddy mo. Ask about prices, basket, o budget.');
  else if(q.intent==='HELP')reply.text=say('I can list products and supplied prices, compare clear pack sizes, find cheaper matches, make a sample shopping breakdown, check your real basket and add or remove items. I don’t know live stock, missing aisles or medical advice. Try the question chips below.','Kaya kong maglista ng produkto at presyo, magkumpara ng malinaw na sukat, maghanap ng mas mura, gumawa ng halimbawang listahan, at tumulong sa basket. Hindi ko alam ang live stock o nawawalang aisle, at hindi ako nagbibigay ng payong medikal. Subukan ang mga tanong sa ibaba.');
  else if(q.intent==='CLEAR_BASKET'){reply.text=say('Clear every item from your basket? Nothing changes until you confirm.','Tatanggalin ang lahat ng laman ng basket? Walang mababago hangga’t hindi mo kinukumpirma.');reply.actions=[{type:'confirm-clear',label:say('Clear basket…','I-clear ang basket…')}];}
  else if(q.intent==='BASKET_QUERY'){
   let total=0,count=0,unknown=0;for(const line of basket){const cents=line.manualCentavos??line.unitCentavos??line.product?.priceCentavos;count+=line.quantity;if(cents==null)unknown+=line.quantity;else total+=cents*line.quantity;}
   reply.text=say(`Your basket has ${count} items. Known subtotal: ${pesos(total)}.`,`May ${count} item sa basket mo. Subtotal na may presyo: ${pesos(total)}.`,`${count} items sa basket mo. Known subtotal: ${pesos(total)}.`);
   if(unknown)reply.text+=' '+say(`${unknown} items need a shelf price; the estimate is incomplete.`,`${unknown} item ang walang presyo; hindi pa kumpleto ang tantiya.`);
   reply.text+=' '+(budget>0?say(`Budget: ${pesos(budget)}. ${total>budget?'Over by':'Remaining'}: ${pesos(Math.abs(budget-total))}.`,`Budget: ${pesos(budget)}. ${total>budget?'Sobra ng':'Matitira'}: ${pesos(Math.abs(budget-total))}.`):say('Set a trip budget in My basket to see the balance.','Maglagay ng trip budget sa Aking basket para makita ang balanse.'));
   reply.table={kind:'basket',rows:basket.map(l=>({id:l.product.sku,name:l.product.name,quantity:l.quantity,priceCentavos:l.manualCentavos??l.unitCentavos??l.product.priceCentavos,subtotalCentavos:(l.manualCentavos??l.unitCentavos??l.product.priceCentavos)==null?null:(l.manualCentavos??l.unitCentavos??l.product.priceCentavos)*l.quantity}))};
   if(/remove|alis/.test(q.text)&&budget>0&&total>budget){const sorted=[...reply.table.rows].filter(r=>r.subtotalCentavos!=null).sort((a,b)=>b.subtotalCentavos-a.subtotalCentavos);reply.text+=' '+say('Review the largest optional lines: ','Suriin ang pinakamalalaking puwedeng bawasan: ')+sorted.slice(0,3).map(r=>r.name+' ('+pesos(r.subtotalCentavos)+')').join('; ')+'.';}
  }
  else if(q.intent==='BASKET_ACTION'){
   const remove=/^(remove|tanggalin|alisin)/.test(q.text);let product=reference&&hasFocus?this.byId.get(this.focus.ids[refIndex]):rows.length===1?rows[0]:null;
   if(!product&&rows.length){reply.text=say('Choose the exact item below before I change your basket.','Piliin muna ang eksaktong item sa ibaba bago baguhin ang basket.');reply.cards=rows.slice(0,5);}
   else if(!product){reply.text=say('Choose an item from a previous result or give its full SKU. Your basket has not changed.','Pumili ng item mula sa resulta o ilagay ang SKU. Hindi nabago ang basket mo.');}
   else{const quantity=Math.min(9999,Math.max(1,+(q.text.match(/(?:add|idagdag|lagay|ilagay|isama|remove|tanggalin|alisin)\s+(\d+)/)?.[1]||1)));if(remove&&!basket.some(l=>l.product.sku===product.sku)){reply.text=say('That item is not in your basket.','Wala ang item na iyan sa basket mo.');}else{reply.text=say(`${remove?'Remove':'Add'} ${quantity} × ${product.name}.`,`${remove?'Alisin':'Idagdag'} ang ${quantity} × ${product.name}.`);reply.actions=[{type:remove?'basket-remove':'basket-add',auto:true,label:remove?'Remove':'Add',payload:{sku:product.sku,quantity}}];reply.cards=[product];}}
  }
  else if(['BUDGET_PLAN','MEAL_HELP'].includes(q.intent)){
   if(q.invalidAmount){reply.text=say('Use a positive budget up to ₱10,000,000 with no more than two decimal places.','Maglagay ng positibong budget hanggang ₱10,000,000, na hanggang dalawang decimal lamang.');reply.intent='ERROR';}
   else{let needs=['rice','egg','vegetable'];if(q.intent==='MEAL_HELP')needs=/adobo/.test(q.text)?['chicken','soy sauce','vinegar','garlic']:/spaghetti/.test(q.text)?['spaghetti','tomato','cheese']:/sinigang/.test(q.text)?['pork','vegetable','tomato']:/breakfast|agahan|almusal|baon/.test(q.text)?['bread','egg','milk']:['rice','egg','vegetable'];else{const supplied=['rice','egg','vegetable','chicken','pork','milk','bread','oil','coffee','soap','shampoo'].filter(key=>this.terms(q.text).includes(key));if(supplied.length)needs=supplied;}
    let balance=q.amount??Infinity,total=0;const picked=[],missing=[];for(const need of needs){const choices=this.search(need).rows.filter(p=>p.priceCentavos!=null&&p.inStock!==false&&p.priceCentavos<=balance).sort((a,b)=>a.priceCentavos-b.priceCentavos||a.sku.localeCompare(b.sku));if(!choices.length){missing.push(need);continue;}const p=choices[0];picked.push(p);total+=p.priceCentavos;balance-=p.priceCentavos;}
    reply.cards=picked;reply.text=say('Sample shopping list: one listed selling unit of each item. Quantities are suggestions, not a guarantee of meals or nutrition for a whole week.','Halimbawang listahan: tig-isang nakalistang selling unit ng bawat item. Mungkahi lang ang dami; hindi garantiyang sapat ito sa pagkain o nutrisyon sa buong linggo.','Sample list: tig-isang listed selling unit. Suggested quantities lang; hindi guaranteed na pang-isang linggong meals.');reply.text+=' '+say(`Subtotal: ${pesos(total)}.`,`Subtotal: ${pesos(total)}.`);if(q.amount!=null)reply.text+=' '+say(`Remaining from ${pesos(q.amount)}: ${pesos(q.amount-total)}.`,`Matitira sa ${pesos(q.amount)}: ${pesos(q.amount-total)}.`);if(missing.length)reply.text+=' '+say('Not included (no matching item within this budget): ','Hindi naisama (walang katugmang pasok sa budget): ')+missing.join(', ')+'.';reply.table={kind:'plan',totalCentavos:total,remainingCentavos:q.amount==null?null:q.amount-total,rows:picked.map(p=>({id:p.id,name:p.name,quantity:1,priceCentavos:p.priceCentavos,subtotalCentavos:p.priceCentavos}))};
   }
  }
  else if(q.intent==='PROMO'){
   rows=(rows.length?rows:this.products).filter(p=>Number.isSafeInteger(p.promoCentavos)&&p.promoCentavos>=0&&p.promoCentavos<p.priceCentavos&&p.promoStart<=day&&p.promoEnd>=day);reply.cards=rows.slice(0,q.count);reply.text=rows.length?say('These records have a dated promotion active on the selected day.','May nakatalang promo ang mga ito na sakop ng petsa ngayon.'):say('No verified active promotions are saved. Ask staff about current offers; I won’t invent a sale.','Walang naka-save na beripikadong aktibong promo. Magtanong sa staff para sa kasalukuyang alok; hindi ako gagawa ng pekeng sale.');
  }
  else if(q.intent==='LOCATION'){reply.cards=rows.slice(0,5);reply.text=rows.some(p=>p.aisle)?rows.slice(0,5).map(p=>p.name+': '+(p.aisle||say('aisle not listed','walang aisle'))).join('\n'):say('Aisle locations are not supplied in this catalog. The matching departments/categories are shown below; please ask staff for the exact shelf.','Walang aisle location sa catalog. Nasa ibaba ang department/category ng mga katugma; itanong sa staff ang eksaktong puwesto.');}
  else if(q.intent==='COMPARE'){
   const parts=q.text.replace(/^.*?\b(?:compare|ikumpara|kumpara)\b/,'').split(/\s+(?:vs|versus|o|against|kumpara sa)\s+/).map(s=>s.trim());
   if(parts.length>=2){const groups=parts.slice(0,2).map(part=>this.search(part).rows.filter(p=>p.priceCentavos!=null).sort((a,b)=>a.priceCentavos-b.priceCentavos||a.sku.localeCompare(b.sku)));rows=groups.flatMap(g=>g.slice(0,3));reply.text=groups.every(g=>g.length)?say('Lowest listed pack prices for each search are shown below. Different sizes are not automatically equivalent.','Nasa ibaba ang pinakamababang pack price ng bawat hinanap. Hindi awtomatikong magkapareho ang magkaibang sukat.'):say('I could not match both sides. These are the exact matches I found; try the full names or SKUs.','Hindi nagtugma ang dalawang panig. Ito lang ang eksaktong nakita; subukan ang buong pangalan o SKU.');}else reply.text=say('Compare these matching items below. Give two names with “vs” for a narrower comparison.','Ihambing ang mga katugma sa ibaba. Gumamit ng dalawang pangalan na may “vs” para mas tiyak.');
   reply.cards=rows.slice(0,10);
  }
  else if(q.intent==='UNKNOWN')reply.text=say('I can help with the saved Hypermart items, prices and your shopping budget. I don’t have an answer for that. Try “cheapest rice” or choose a question below.','Tungkol lang po sa naka-save na Hypermart items, presyo at budget ang kaya ko. Wala akong sagot diyan. Subukan ang “pinakamurang bigas” o ang mga tanong sa ibaba.');
  else{
   const available=rows.filter(p=>p.inStock!==false);if(q.intent==='UNDER_BUDGET'){if(q.invalidAmount||q.amount==null){reply.text=say('Enter a valid positive price limit.','Maglagay ng wastong positibong limitasyon ng presyo.');reply.intent='ERROR';}else{rows=available.filter(p=>p.priceCentavos!=null&&(q.strictMax?p.priceCentavos<q.amount:p.priceCentavos<=q.amount)&&(q.min==null||p.priceCentavos>=q.min));if(!found.terms.length)rows=this.products.filter(p=>p.priceCentavos!=null&&p.priceCentavos<=q.amount&&p.inStock!==false);}}
   if(q.intent==='ALTERNATIVES'&&hasFocus){const p=rows[0]||this.byId.get(this.focus.ids[0]);rows=this.products.filter(other=>other.id!==p.id&&other.category===p.category&&other.subcategory===p.subcategory&&other.priceCentavos!=null&&other.priceCentavos<p.priceCentavos&&other.inStock!==false);}
   if(['CHEAPEST','UNDER_BUDGET','ALTERNATIVES','MOST_EXPENSIVE'].includes(q.intent))rows=[...rows].sort((a,b)=>a.priceCentavos==null?1:b.priceCentavos==null?-1:(q.intent==='MOST_EXPENSIVE'?b.priceCentavos-a.priceCentavos:a.priceCentavos-b.priceCentavos)||a.sku.localeCompare(b.sku));
   if(q.intent==='BEST_VALUE'&&new Set(rows.filter(p=>p.unitPrice).map(p=>p.unitPrice.unit+'|'+p.category+'|'+p.subcategory)).size===1)rows=[...rows].sort((a,b)=>a.unitPrice==null?1:b.unitPrice==null?-1:a.unitPrice.exact-b.unitPrice.exact||a.sku.localeCompare(b.sku));
   const offset=q.intent==='MORE'?(this.focus.offset||0)+q.count:0;reply.cards=rows.slice(offset,offset+q.count);
   if(q.intent==='CHEAPEST'&&rows.length){const best=rows.filter(p=>p.unitPrice&&p.category===rows[0].category&&p.subcategory===rows[0].subcategory&&p.unitPrice.unit===rows[0].unitPrice?.unit).sort((a,b)=>a.unitPrice.exact-b.unitPrice.exact)[0];if(best&&!reply.cards.some(p=>p.id===best.id))reply.cards.push(best);}
   if(!reply.text){
    if(!rows.length)reply.text=say('No exact matching items fit that request in the saved catalog. Try a shorter product name, another category or a different price limit.','Walang eksaktong katugma na pasok sa hinahanap sa na-save na catalog. Subukan ang mas maikling pangalan, ibang kategorya o ibang limitasyon.');
    else if(q.intent==='AVAILABILITY')reply.text=say(`${rows.length} matching records are listed. Live stock is unknown; this does not confirm availability on the shelf.`,`May ${rows.length} katugmang nakalista. Hindi alam ang live stock; hindi ito kumpirmasyong nasa estante pa ang produkto.`);
    else if(q.intent==='CHEAPEST'||q.intent==='UNDER_BUDGET'||q.intent==='ALTERNATIVES')reply.text=say(`Lowest pack price among ${rows.length} matching records: ${rows[0].name} — ${rows[0].priceCentavos==null?'price unavailable':pesos(rows[0].priceCentavos)}.`,`Pinakamurang nakalistang pack sa ${rows.length} katugma: ${rows[0].name} — ${rows[0].priceCentavos==null?'walang presyo':pesos(rows[0].priceCentavos)}.`,`Lowest pack price sa ${rows.length} matches: ${rows[0].name} — ${rows[0].priceCentavos==null?'price unavailable':pesos(rows[0].priceCentavos)}.`);
    else if(q.intent==='MOST_EXPENSIVE')reply.text=say('Highest listed pack prices are first.','Pinakamataas na nakalistang pack price ang nauuna.');
    else if(q.intent==='BEST_VALUE')reply.text=say('Unit costs below use clearly parsed label sizes, not verified selling-pack data. Unknown or ambiguous sizes cannot establish best value.','Gamit ng unit cost sa ibaba ang malinaw na sukat mula sa pangalan, hindi beripikadong selling-pack data. Hindi mairaranggo ang kulang o malabong sukat.');
    else reply.text=say(`Here are ${reply.cards.length} of ${rows.length} matching saved items and their supplied prices.`,`Narito ang ${reply.cards.length} sa ${rows.length} katugmang naka-save na item at presyo.`,`${reply.cards.length} sa ${rows.length} matching items, with supplied prices, nasa ibaba.`);
   }
   if(rows.length){this.focus={lastQuery:found.text||this.focus.lastQuery,topic:found.topic,ids:reply.cards.map(p=>p.id),offset};if(rows.length>offset+q.count)reply.quickReplies=[...initial.slice(0,2),lang==='en'?'What else?':'Ano pa?'];}
  }
  if(reply.cards.length){
   if(!reply.table)reply.table={kind:'products',rows:reply.cards.map(p=>({id:p.id,name:p.name,priceCentavos:p.priceCentavos,size:p.parsedSize?.label||null,sizeSource:p.sizeSource,unitPrice:p.unitPrice,aisle:p.aisle,stock:p.inStock}))};
   const comparable=reply.cards.filter(p=>p.unitPrice),units=new Set(comparable.map(p=>p.unitPrice.unit)),families=new Set(comparable.map(p=>p.category+'|'+p.subcategory));
   if(['COMPARE','BEST_VALUE','CHEAPEST'].includes(q.intent)&&comparable.length>=2&&units.size===1&&families.size===1){const sorted=[...comparable].sort((a,b)=>a.unitPrice.exact-b.unitPrice.exact),best=sorted[0];reply.text+=' '+say(`Label-size comparison: ${best.name} is ${pesos(best.unitPrice.displayCentavos)}/${best.unitPrice.displayUnit}. Verify the selling pack before relying on this comparison.`,`Batay sa sukat sa pangalan: ${best.name} ay ${pesos(best.unitPrice.displayCentavos)}/${best.unitPrice.displayUnit}. Tiyakin muna ang selling pack bago umasa sa paghahambing.`);}
   if(reply.cards.some(p=>!p.parsedSize))reply.text+=' '+say('Some sizes are not listed; their unit cost is unknown.','May mga sukat na hindi nakalista; hindi alam ang unit cost nila.');
   if(reply.cards.some(p=>/INFANTS|OTC MEDS|ALCOHOLIC BEVERAGES/.test(p.category)))reply.text+=' '+say('Prices/catalog information only; no medical, infant-feeding or drinking advice.','Presyo at catalog information lamang; walang payong medikal, pagpapakain ng sanggol o pag-inom.');
   reply.text+='\n'+source;
   if(!['BASKET_ACTION','BUDGET_PLAN','MEAL_HELP','MORE'].includes(q.intent))this.focus={lastQuery:found.text,topic:found.topic,ids:reply.cards.map(p=>p.id),offset:0};
  }
  if(found.corrections.length){reply.corrections=found.corrections;reply.confidence=Math.min(...found.corrections.map(c=>c.confidence));reply.text=say('Matched spelling: ','Katugmang baybay: ')+found.corrections.map(c=>c.from+' → '+c.to).join(', ')+'.\n'+reply.text;}
  const nameTokens=fold(raw).split(' '),nicknames=this.jokes.nicknames||['julian','julyan','hulyan','julz','jul','julien'];const named=nameTokens.some(token=>nicknames.includes(token)||token.length>=6&&distance(token,'julian')<=1);
  if(named&&julian&&this.config.enableJulian!==false&&!serious.has(reply.intent)){
   this.mentions++;let key=/late|oras|huli/.test(q.text)?'late':/sino|who/.test(q.text)?'who':/love|crush|jowa/.test(q.text)?'crush':/pogi|ganda|handsome|compliment/.test(q.text)?'compliment':['BUDGET_PLAN','BASKET_QUERY'].includes(q.intent)?'budget':found.topic==='rice'?'rice':q.intent==='MOST_EXPENSIVE'?'premium':/shampoo|beauty|lotion/.test(q.text)?'beauty':/beer|alak|drink|juice|water/.test(q.text)?'drinks':q.intent==='SMALLTALK'?'greetings':['PRICE_OF','CHEAPEST'].includes(q.intent)?'price':'generic';
   const pool=(this.jokes.pools?.[key]||[]).filter(line=>line.lang===lang||lang==='taglish');const all=pool.length?pool:(this.jokes.pools?.generic||[]);let line=all[(this.mentions*7+raw.length)%Math.max(1,all.length)]?.text||'Julian brought the dramatic entrance again. Friendly joke lang!';if(line===this.previousJoke)line=all[(all.findIndex(x=>x.text===line)+1)%all.length]?.text||line;this.previousJoke=line;
   if(this.mentions===2)line+=say(' Julian is back in the spotlight!',' Si Julian na naman ang bida!');if(this.mentions===5)line+=say(' Fifth cameo—confetti for Julian! 🎉',' Ikalimang cameo—confetti para kay Julian! 🎉');
   reply.text=line+(reply.intent==='UNKNOWN'?'':'\n\n'+reply.text);reply.julian=true;
  }
  reply.context={...this.focus};this.turns.push({question:raw,intent:reply.intent});this.turns=this.turns.slice(-20);return reply;
 }
}
