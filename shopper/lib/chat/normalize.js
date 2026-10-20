export const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}.₱/]+/gu,' ').replace(/\.(?!\d)/g,' ').trim().replace(/\s+/g,' ');
const numbers={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,isa:1,isang:1,dalawa:2,dalawang:2,tatlo:3,tatlong:3,apat:4,naapat:4,lima:5,limang:5,anim:6,animna:6,pito:7,pitong:7,walo:8,walong:8,siyam:9,siyamna:9,sampu:10,sampung:10,labingisa:11,labindalawa:12,labintatlo:13,labinapat:14,labinlima:15,dalawampu:20,tatlumpu:30,apatnapu:40,limampu:50,animnapu:60,pitumpu:70,walumpu:80,siyamnapu:90};
export function normalizeNumbers(text){
 const words=fold(String(text).replace(/(\d),(?=\d{3}(?:\D|$))/g,'$1')).replace(/labing isa/g,'labingisa').replace(/apat na pu/g,'apatnapu').split(' '),out=[];let value=null,total=0;
 const flush=()=>{if(value!==null){out.push(String(total+value));value=null;total=0;}};
 for(let i=0;i<words.length;i++){
  const word=words[i];if(word in numbers){value=(value??0)+numbers[word];}
  else if(['hundred','daan'].includes(word)){value=(value??1)*100;}
  else if(['thousand','libo'].includes(word)){total+=(value??1)*1000;value=0;}
  else if(['and','at','na'].includes(word)&&value!==null&&words[i+1] in numbers)continue;
  else{flush();out.push(word);}
 }flush();return out.join(' ');
}
export function detectLanguage(text){
 const words=fold(text).split(' '),tl=new Set('po ba ang ng mga yung ano anong magkano mura murang pinakamura pinakamurang mahal pinakamahal saan meron mayroon pa naman lang sana kasi ako ko mo may bigas gatas itlog magkakasya matitira salamat kumusta idagdag tanggalin alin dito kay'.split(' ')),en=new Set('what whats which cheapest expensive price how much show list please under budget compare my the is are can you hello thanks add remove available where best with rice milk eggs'.split(' '));
 let a=0,b=0;for(const word of words){if(tl.has(word))a++;if(en.has(word))b++;}if(!a)return 'en';if(!b)return 'tl';return b>=2&&a>=1||b>=1&&a<=2?'taglish':'tl';
}
export function distance(a,b){
 if(Math.abs(a.length-b.length)>2)return 3;const rows=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
 for(let i=0;i<=a.length;i++)rows[i][0]=i;for(let j=0;j<=b.length;j++)rows[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);}return rows[a.length][b.length];
}
const units={kg:['g',1000],kilo:['g',1000],kilos:['g',1000],kilogram:['g',1000],kilograms:['g',1000],g:['g',1],gram:['g',1],grams:['g',1],l:['ml',1000],liter:['ml',1000],liters:['ml',1000],litre:['ml',1000],litres:['ml',1000],ml:['ml',1],milliliter:['ml',1],milliliters:['ml',1],pc:['pc',1],pcs:['pc',1],piece:['pc',1],pieces:['pc',1],s:['pc',1]};
export function parseSize(raw,{fromName=false}={}){
 const text=String(raw??'').toLowerCase().replace(/½/g,'1/2').replace(/×/g,'x').trim();if(!text)return null;
 if(/\bdozen\b|\bdosena\b/.test(text))return {value:12,unit:'pc',baseValue:12,baseUnit:'pc',label:'12 pc',source:'name',comparable:true};
 const matches=[...text.matchAll(/(\d+(?:\.\d+)?(?:\/\d+)?)\s*(kilograms?|kilos?|kg|grams?|g|milliliters?|liters?|litres?|ml|l|pieces?|pcs?|s)(?=x\d|\b)/g)];
 if(matches.length!==1){const count=text.match(/(?:pack of\s*|^x\s*)(\d+)\b/);return count?{value:+count[1],unit:'pc',baseValue:+count[1],baseUnit:'pc',label:count[1]+' pc',source:'name',comparable:true}:null;}
 const match=matches[0],fraction=match[1].split('/').map(Number);let value=fraction.length===2?fraction[0]/fraction[1]:fraction[0];const unit=units[match[2]],before=text.slice(0,match.index),after=text.slice(match.index+match[0].length);
 const multiplier=before.match(/(\d+)\s*x\s*$/),suffix=after.match(/^\s*x\s*(\d+)/);let ambiguous=false;
 if(multiplier){if(/\d\s*x/.test(before.slice(0,multiplier.index)))ambiguous=true;value*=+multiplier[1];}
 if(suffix){if(fromName)ambiguous=true;value*=+suffix[1];}
 if(!Number.isFinite(value)||value<=0||value>100000000)return null;
 return {value,unit:match[2],baseValue:value*unit[1],baseUnit:unit[0],label:(value*unit[1]).toLocaleString('en-PH')+' '+unit[0],source:'name',comparable:!ambiguous,ambiguous};
}
export function unitCost(cents,size){
 if(!Number.isSafeInteger(cents)||cents<0||!size?.comparable||!(size.baseValue>0))return null;
 const basis=size.baseUnit==='pc'?1:100,amount=cents*basis/size.baseValue;
 if(!Number.isFinite(amount)||amount>Number.MAX_SAFE_INTEGER)return null;
 return {centavos:Math.round(amount),exact:amount,basis,unit:size.baseUnit,displayCentavos:Math.round(cents*(size.baseUnit==='pc'?1:1000)/size.baseValue),displayUnit:size.baseUnit==='g'?'kg':size.baseUnit==='ml'?'L':'pc'};
}
const currencyFormat=new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2,maximumFractionDigits:2});
export const pesos=cents=>currencyFormat.format(cents/100);
export function normalizeProduct(raw){
 const explicit=Number.isFinite(raw.size)&&raw.unit?parseSize(raw.size+' '+raw.unit):null,parsed=explicit||parseSize(raw.name,{fromName:true});
 const centavos=Number.isSafeInteger(raw.priceCentavos)&&raw.priceCentavos>=0?raw.priceCentavos:null;
 return {...raw,id:String(raw.sku),sku:String(raw.sku),priceCentavos:centavos,brand:raw.brand||null,aisle:raw.aisle||null,inStock:typeof raw.inStock==='boolean'?raw.inStock:null,parsedSize:parsed,sizeSource:explicit?'verified':parsed?'product name':'not listed',unitPrice:unitCost(centavos,parsed),searchText:fold([raw.sku,raw.name,raw.brand,raw.category,raw.subcategory,...(raw.barcodes||[])].filter(Boolean).join(' '))};
}
