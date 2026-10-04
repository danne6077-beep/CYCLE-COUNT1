const layoutControlIds=['paperSize','orientation','pageMargins','rowsPerPage','rowHeight','fontSize','barcodeWidth','countLineWidth','showSheetBarcode','showSheetLocator','showSupplierHeader','supplierGroupingMode','combineGroupOptionsFilter'];
const paperSizeControl=$('paperSize');

function getSupplierOptions(){
	return [...new Set((items||[]).map(item=>item.supplier||'Unassigned Supplier'))].sort();
}

function getInventoryPrintSignature(){
	const source=JSON.stringify((items||[]).map(item=>[
		item.supplier||'Unassigned Supplier',item.sku||'',item.barcode||'',item.description||'',item.locator||''
	]).sort((left,right)=>JSON.stringify(left).localeCompare(JSON.stringify(right))));
	let hash=2166136261;
	for(let index=0;index<source.length;index++)hash=Math.imul(hash^source.charCodeAt(index),16777619);
	return `${(hash>>>0).toString(36)}-${source.length}`;
}

function getPrintedCombinedSuppliers(){
	try{
		const saved=JSON.parse(localStorage.getItem('danne-lozana-printed-suppliers')||'null');
		if(saved?.signature===getInventoryPrintSignature()&&Array.isArray(saved.suppliers))return new Set(saved.suppliers);
	}catch(error){localStorage.removeItem('danne-lozana-printed-suppliers')}
	return new Set();
}

function markCombinedSuppliersPrinted(suppliers,signature=getInventoryPrintSignature()){
	if(signature!==getInventoryPrintSignature())return false;
	const printed=getPrintedCombinedSuppliers();
	suppliers.forEach(supplier=>printed.add(supplier));
	localStorage.setItem('danne-lozana-printed-suppliers',JSON.stringify({signature,suppliers:[...printed]}));
	syncSupplierSelectionList();
	renderCountSheet();
	refreshLayoutPreview();
	return true;
}

function resetCombinedPrintStatus(){
	localStorage.removeItem('danne-lozana-printed-suppliers');
	syncSupplierSelectionList();
	if(typeof renderCountSheet==='function')renderCountSheet();
	if(typeof refreshLayoutPreview==='function')refreshLayoutPreview();
}

function getCombinedGroupOptions(){
	const mode=$('supplierGroupingMode')?.value||'all';
	const ccd=$('countSheetCcdFilter')?.value||'all';
	const department=$('countSheetDepartmentFilter')?.value||'all';
	const supplier=$('supplierFilter')?.value||'all';
	const category=$('countSheetCategoryFilter')?.value||'all';
	const activeCategory=category==='__mix__'?'all':category;
	const combineMode=$('combineGroupOptionsFilter')?.value||'separate';
	if(combineMode==='combined'){
		if(mode==='category')return ['ALL_CATEGORIES_COMBINED'];
		if(mode==='supplier')return ['ALL_SUPPLIERS_COMBINED'];
		if(mode==='supplier-category')return ['ALL_SUPPLIERS_AND_CATEGORIES_COMBINED'];
	}
	if(mode==='category'||mode==='supplier-category'){
		const categories=CountSheetFilters.getDepartmentCategoryOptions(items,{ccd,department,supplier: supplier==='all'?'all':supplier});
		if(mode==='supplier-category'){
			const suppliers=CountSheetFilters.getDepartmentSupplierOptions(items,{ccd,department,category:activeCategory});
			return suppliers.flatMap(supplierValue=>categories.map(categoryValue=>`${supplierValue} - ${categoryValue}`));
		}
		return categories;
	}
	return CountSheetFilters.getDepartmentSupplierOptions(items,{ccd,department,category:activeCategory});
}

function getSelectedCombinedSuppliers(){
	const options=getCombinedGroupOptions();
	if(!options.length)return [];
	const saved=JSON.parse(localStorage.getItem('danne-lozana-combined-suppliers')||'null');
	const selected=Array.isArray(saved)?saved.filter(value=>options.includes(value)):options.slice();
	return options.filter(value=>selected.includes(value));
}

function setCombinedSuppliers(selected){
	localStorage.setItem('danne-lozana-combined-suppliers',JSON.stringify(selected));
	syncSupplierSelectionList();
	renderCountSheet();
	refreshLayoutPreview();
}

function syncSupplierSelectionList(){
	const list=$('supplierSelectionList');
	if(!list)return;
	const mode=$('supplierGroupingMode')?.value||'all';
	const options=getCombinedGroupOptions();
	const printedSuppliers=getPrintedCombinedSuppliers();
	const availableOptions=options.filter(value=>!printedSuppliers.has(value));
	const selectedOptions=getSelectedCombinedSuppliers().filter(value=>!printedSuppliers.has(value));
	const selectedSet=new Set(selectedOptions);
	list.hidden=mode==='all' || options.length < 2;
	list.innerHTML='';
	if(!options.length)return;
	const actions=document.createElement('div');
	actions.className='supplier-selection-actions';
	const selectAll=document.createElement('button');
	selectAll.type='button';
	selectAll.className='supplier-selection-action';
	selectAll.textContent='Select All';
	selectAll.disabled=selectedSet.size===availableOptions.length;
	selectAll.addEventListener('click',()=>setCombinedSuppliers(availableOptions));
	const clearAll=document.createElement('button');
	clearAll.type='button';
	clearAll.className='supplier-selection-action';
	clearAll.textContent='Clear All';
	clearAll.disabled=selectedSet.size===0;
	clearAll.addEventListener('click',()=>setCombinedSuppliers([]));
	const resetPrinted=document.createElement('button');
	resetPrinted.type='button';
	resetPrinted.className='supplier-selection-action reset-printed';
	resetPrinted.textContent='Reset Printed';
	resetPrinted.disabled=printedSuppliers.size===0;
	resetPrinted.addEventListener('click',resetCombinedPrintStatus);
	actions.append(selectAll,clearAll,resetPrinted);
	list.appendChild(actions);

	options.forEach(value=>{
		const isPrinted=printedSuppliers.has(value);
		const button=document.createElement('button');
		button.type='button';
		button.className=`supplier-combine-option${isPrinted?' is-printed':selectedSet.has(value)?' is-selected':''}`;
		button.dataset.supplier=value;
		button.disabled=isPrinted;
		button.setAttribute('aria-pressed',String(!isPrinted&&selectedSet.has(value)));
		button.textContent=value;
		if(isPrinted){
			const tag=document.createElement('span');
			tag.className='supplier-printed-tag';
			tag.textContent='PRINTED';
			button.appendChild(tag);
		}
		button.addEventListener('click',()=>{
			if(isPrinted)return;
			const current=getSelectedCombinedSuppliers().filter(item=>!printedSuppliers.has(item));
			const next=current.includes(value)?current.filter(item=>item!==value):[...current,value];
			setCombinedSuppliers(next);
		});
		list.appendChild(button);
	});
	const printable=selectedOptions.length;
	['printSheetBtn','exportSheetBtn'].forEach(id=>{
		const button=$(id); if(button)button.disabled=mode==='all' ? false : printable===0;
	});
}

paperSizeControl.querySelector('option[value="letter"]').textContent='Short bond · Letter (8.5 x 11 in)';
paperSizeControl.querySelector('option[value="legal"]').textContent='Legal · 8.5 x 14 in';
paperSizeControl.add(new Option('Long bond · Folio (8.5 x 13 in)','folio'));
function saveLayoutSettings(){const values={};layoutControlIds.forEach(id=>{const control=document.getElementById(id);values[id]=control.type==='checkbox'?control.checked:control.value});localStorage.setItem('danne-lozana-count-layout',JSON.stringify(values))}
function restoreLayoutSettings(){try{const values=JSON.parse(localStorage.getItem('danne-lozana-count-layout')||'{}');layoutControlIds.forEach(id=>{const control=document.getElementById(id);if(values[id]===undefined)return;if(control.type==='checkbox')control.checked=values[id];else{if(id==='rowsPerPage'&&!Array.from(control.options).some(option=>option.value===String(values[id]))){control.add(new Option(`${values[id]} rows`,String(values[id])))}control.value=values[id]}})}catch(error){localStorage.removeItem('danne-lozana-count-layout')}
if(typeof applyLayout==='function')applyLayout(false);if(typeof refreshLayoutPreview==='function')refreshLayoutPreview()}
restoreLayoutSettings();
layoutControlIds.forEach(id=>{const control=document.getElementById(id);control.addEventListener('change',()=>{saveLayoutSettings();if(typeof recordLocalHistory==='function')recordLocalHistory('Layout changed',`${id}: ${control.type==='checkbox'?control.checked:control.value}`)});control.addEventListener('input',saveLayoutSettings)});
$('configureSheetBtn').onclick=()=>{showStep(3);refreshLayoutPreview()};

$('creditsBtn').onclick=()=>{$('developersModal').hidden=false};
$('closeDevelopers').onclick=()=>{$('developersModal').hidden=true};
$('developersModal').onclick=event=>{if(event.target===$('developersModal'))$('developersModal').hidden=true};

function updateSupplierFilter(){
	const filter=$('supplierFilter');
	if(!filter)return;
	const current=filter.value;
	const ccd=$('countSheetCcdFilter')?.value||'all';
	const department=$('countSheetDepartmentFilter')?.value||'all';
	const category=$('countSheetCategoryFilter')?.value||'all';
	const categoryKey=category==='__mix__'?'all':category;
	const suppliers=CountSheetFilters.getDepartmentSupplierOptions(items,{ccd,department,category:categoryKey});
	filter.innerHTML='<option value="all">All suppliers</option>'+suppliers.map(supplier=>`<option value="${supplier}">${supplier}</option>`).join('');
	filter.value=suppliers.includes(current)?current:'all';
	syncSupplierSelectionList();
	updatePaperUseEstimate();
}
updateSupplierFilter();
$('supplierFilter').addEventListener('change',()=>{updateCountSheetCategoryFilter();renderCountSheet();refreshLayoutPreview()});
$('supplierGroupingMode')?.addEventListener('change',()=>{localStorage.removeItem('danne-lozana-combined-suppliers');if($('supplierGroupingMode').value==='category'&&$('countSheetCategoryFilter').value!== '__mix__'){ $('countSheetCategoryFilter').value='__mix__'; updateCountSheetCategoryFilter(); } syncSupplierSelectionList(); renderCountSheet(); refreshLayoutPreview(); saveLayoutSettings(); });
$('combineGroupOptionsFilter')?.addEventListener('change',()=>{
	localStorage.removeItem('danne-lozana-combined-suppliers');
	syncSupplierSelectionList();
	renderCountSheet();
	refreshLayoutPreview();
	saveLayoutSettings();
});
$('countSheetCategoryFilter').addEventListener('change',()=>{
	const selectedCategory=$('countSheetCategoryFilter')?.value||'';
	if(selectedCategory==='__mix__'&&$('supplierGroupingMode')?.value!=='category'){$('supplierGroupingMode').value='category';}
	updateSupplierFilter();
	renderCountSheet();
	refreshLayoutPreview();
});

const rowsSelect=$('rowsPerPage');
function updatePaperUseEstimate(){
	const estimate=$('paperUseEstimate');
	if(!estimate)return;
	if(!items.length){estimate.textContent='Import inventory to estimate bond-paper use.';return;}
	const perPage=Math.max(1,Number($('rowsPerPage')?.value)||8);
	const groupedRows=items.reduce((counts,item)=>{const supplier=item.supplier||'Unassigned Supplier';counts[supplier]=(counts[supplier]||0)+1;return counts},{});
	const sheets=Object.values(groupedRows).reduce((total,count)=>total+Math.ceil(count/perPage),0);
	const paper=$('paperSize').selectedOptions[0]?.textContent.split(' · ')[0]||'paper';
	const orientation=$('orientation').value;
	estimate.textContent=`Estimated sheets: ${sheets} · ${perPage} rows per sheet · ${paper} ${orientation}`;
}
if(rowsSelect){
	if(!localStorage.getItem('danne-lozana-count-layout')){if(!Array.from(rowsSelect.options).some(option=>option.value==='7'))rowsSelect.add(new Option('7 rows','7'));rowsSelect.value='7'}
	const rowsInput=document.createElement('input');
	rowsInput.type='number';rowsInput.id='rowsPerPageFree';rowsInput.min='1';rowsInput.max='30';rowsInput.value=rowsSelect.value;rowsInput.title='Type any number of rows';rowsInput.style.marginTop='6px';
	rowsSelect.parentElement.appendChild(rowsInput);
	const presetWrap=document.createElement('div');presetWrap.className='rows-presets';
	[5,7,10,15,20,25,30].forEach(value=>{const button=document.createElement('button');button.type='button';button.textContent=value;button.dataset.rows=value;button.onclick=()=>{rowsInput.value=value;rowsSelect.value=String(value);if(!Array.from(rowsSelect.options).some(option=>option.value===String(value)))rowsSelect.add(new Option(`${value} rows`,String(value)));rowsSelect.dispatchEvent(new Event('change'));refreshLayoutPreview();saveLayoutSettings()};presetWrap.appendChild(button)});
	rowsSelect.parentElement.appendChild(presetWrap);
	const estimate=document.createElement('small');estimate.id='paperUseEstimate';estimate.style.display='block';estimate.style.marginTop='7px';estimate.style.color='#66726b';rowsSelect.parentElement.appendChild(estimate);
	rowsSelect.addEventListener('change',updatePaperUseEstimate);
	rowsInput.addEventListener('input',()=>{const value=Math.max(1,Math.min(30,Number(rowsInput.value)||1));rowsSelect.value=String(value);if(!Array.from(rowsSelect.options).some(option=>option.value===String(value)))rowsSelect.add(new Option(`${value} rows`,String(value)));rowsSelect.dispatchEvent(new Event('change'));saveLayoutSettings();refreshLayoutPreview()});
	updatePaperUseEstimate();
}
[$('paperSize'),$('orientation')].forEach(control=>control.addEventListener('change',updatePaperUseEstimate));
