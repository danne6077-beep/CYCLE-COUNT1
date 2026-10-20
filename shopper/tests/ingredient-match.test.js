import test from 'node:test';import assert from 'node:assert/strict';
import {ChatEngine} from '../lib/chat/engine.js';import {books} from './planner-fixtures.js';
const product=(sku,name,category,subcategory,priceCentavos,department='FMCG')=>({sku,name,category,subcategory,priceCentavos,department});
const products=[
 product('box','SPAGHETTI BOX SMALL','PARTY ACCESSORIES','OTHER PARTY PRODUCTS',10),
 product('wafer','CHEESE WAFER','READY TO EAT','WAFER',10),
 product('cube','CHICKEN CUBES','COOKING ESSENTIALS','FLAVORINGS',10),
 product('ham-snack','HAM AND CHEESE CHIPS','SNACK FOODS','CURLS',10),
 product('onion-snack','ONION RINGS','SNACK FOODS','CURLS',10),
 product('cream-snack','COCO CREAM WAFER','READY TO EAT','WAFER',10),
 product('cream-milk','FULL CREAM MILK','MILK AND DAIRY','FULL CREAM MILK',10),
 product('coffee','SUGAR FREE COFFEE','NON - ALCOHOLIC BEVERAGES','MIXES',10),
 product('crumb','BREAD CRUMBS','COOKING ESSENTIALS','BREADING MIX',10),
 product('oil','VEGETABLE OIL','STAPLE','VEGETABLE OIL',10,'FRESH & STAPLE'),
 product('chicken','WHOLE CHICKEN','FRESH & FROZEN','CHICKEN',15000,'FRESH & STAPLE'),
 product('pasta','SPAGHETTI 500G','PASTA & NOODLES','SPAGHETTI',5000),
 product('cheese','CHEDDAR CHEESE','BAKING AND SALAD AIDS','CHEESE BLOCKS/SLICED',5000),
 product('cream','ALL PURPOSE CREAM','BAKING AND SALAD AIDS','ALL PURPOSE CREAM',4000),
 product('sugar','WHITE SUGAR','STAPLE','WHITE',4000,'FRESH & STAPLE'),
 product('veg','MIX VEGETABLE','FRESH & FROZEN','READY TO COOK',4000,'FRESH & STAPLE'),
 product('egg','FRESH EGG 6S','STAPLE','FRESH EGGS',6000,'FRESH & STAPLE')
];
test('realistic category collisions cannot replace recipe ingredients with packaging or flavor words',()=>{
 const engine=new ChatEngine(products,{}, {playbooks:books}),plan=engine.respond('Noche Buena for 8 people budget 5000').plan;
 const ids=Object.fromEntries(plan.lines.map(l=>[l.concept,l.sku]));
 assert.equal(ids.chicken,'chicken');assert.equal(ids.spaghetti,'pasta');assert.equal(ids.cheese,'cheese');assert.equal(ids.cream,'cream');
 assert.ok(plan.missing.includes('ham'));assert.ok(!plan.lines.some(l=>['box','wafer','cube','ham-snack','cream-snack'].includes(l.sku)));
 const item=concept=>books.flatMap(b=>b.items).find(i=>i.concept===concept),choices=concept=>engine.planner.candidates(item(concept),{exclusions:[]}).choices;
 assert.equal(choices('onion').length,0);assert.equal(choices('bread').length,0);assert.equal(choices('sugar')[0].sku,'sugar');assert.equal(choices('vegetable')[0].sku,'veg');
});
test('missing meat can use only its explicitly configured egg substitute, with disclosure',()=>{
 const engine=new ChatEngine(products.filter(p=>p.sku!=='chicken'),{}, {playbooks:books});
 const line=engine.respond('Noche Buena for 8 people budget 5000').plan.lines.find(l=>l.concept==='chicken');
 assert.equal(line.sku,'egg');assert.equal(line.substitute,true);
});
