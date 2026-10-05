const layoutControlIds=['paperSize','orientation','pageMargins','rowsPerPage','rowHeight','fontSize','barcodeWidth','countLineWidth','showSheetBarcode','showSheetLocator','showSupplierHeader','supplierGroupingMode','combineGroupOptionsFilter','countSheetPrintMode'];
const paperSizeControl=$('paperSize');
let activeCountSheetMode='selection';
let countSheetPreviewRequested=false;
let countSheetPreviewTimer;
let standardFilterLoadRequest=0;

function isStandardCountSheetMode(){
	return activeCountSheetMode==='standard';
}

function setCountSheetMode(mode){
	activeCountSheetMode=mode;
	countSheetPreviewRequested=false;
	standardFilterLoadRequest++;
	clearTimeout(countSheetPreviewTimer);
	$('countSheetModeSelection').hidden=mode!=='selection';
	$('countSheetModeBar').hidden=mode==='selection';
	$('standardCountSheetMode').hidden=mode!=='standard';
	$('manualCountSheetMode').hidden=mode!=='manual';
	$('countSheetModeStatus').textContent=mode==='standard'?'Standard Count Sheet':mode==='manual'?'Manual Excel / CSV':'';
	$('countSheetPages').replaceChildren();
	if(mode!=='standard'){
		$('supplierSelectionList').replaceChildren();
		$('supplierSelectionList').hidden=true;
	}
	$('countSheetLivePreview')?.replaceChildren(Object.assign(document.createElement('div'),{className:'live-empty',textContent:mode==='standard'?'Choose groups and generate a preview to see count sheets.':'Choose Standard Count Sheet mode to preview.'}));
}

function clearCountSheetPreview(){
	countSheetPreviewRequested=false;
	clearTimeout(countSheetPreviewTimer);
	$('countSheetPages').replaceChildren();
	$('countSheetLivePreview')?.replaceChildren(Object.assign(document.createElement('div'),{className:'live-empty',textContent:'Choose groups and generate a preview to see count sheets.'}));
	$('countSheetSummary').textContent=`Choose one or more ${getPrintMode()==='category'?'categories':'suppliers'} to prepare count sheets.`;
}

function queueCountSheetPreview(message='Updating count sheet preview…'){
	if(!isStandardCountSheetMode())return;
	if(!getSelectedPrintOptions().length){
		clearCountSheetPreview();
		toast(`Select at least one ${getPrintMode()==='category'?'category':'supplier'} to preview.`);
		return;
	}
	countSheetPreviewRequested=true;
	toast(message);
	clearTimeout(countSheetPreviewTimer);
	countSheetPreviewTimer=setTimeout(()=>{
		if(isStandardCountSheetMode())renderCountSheet();
	},40);
}

async function selectCountSheetMode(mode){
	if(mode==='selection'){
		setCountSheetMode('selection');
		return;
	}
	if(mode==='manual'){
		setCountSheetMode('manual');
		toast('Manual Excel / CSV mode ready');
		return;
	}
	if(mode!=='standard')throw new Error(`Unknown count sheet mode: ${mode}`);
	setCountSheetMode('standard');
	const loadRequest=standardFilterLoadRequest;
	$('standardCountSheetMode').setAttribute('aria-busy','true');
	$('countSheetModeStatus').textContent='Loading standard filters…';
	toast('Loading standard count-sheet filters…');
	setTimeout(async()=>{
		try{
			await prepareCountSheetMasterlist({renderInventory:false});
			if(!isStandardCountSheetMode()||loadRequest!==standardFilterLoadRequest)return;
			updateCountSheetCcdFilter();
			updateCountSheetDepartmentFilter();
			updateCountSheetCategoryFilter();
			updateSupplierFilter();
			syncSupplierSelectionList();
			$('countSheetSummary').textContent=items.length
				?`${items.length.toLocaleString()} inventory rows available. Select groups or filters, then generate a preview.`
				:'No inventory data is available yet. Import inventory or load a Masterlist before generating sheets.';
			$('importCountSheetInventory').hidden=items.length>0;
			$('countSheetModeStatus').textContent=items.length?'Standard Count Sheet ready':'No inventory data loaded';
			if(!items.length)toast('No inventory data is available for the standard count sheet.');
		}catch(error){
			if(!isStandardCountSheetMode()||loadRequest!==standardFilterLoadRequest)return;
			$('countSheetModeStatus').textContent='Could not load standard filters';
			$('countSheetSummary').textContent='Standard filters could not be loaded. Return to mode selection and try again.';
			console.error('Could not load standard count-sheet filters:',error);
			toast(`Could not load standard filters: ${error.message}`);
		}finally{
			if(loadRequest===standardFilterLoadRequest)$('standardCountSheetMode').removeAttribute('aria-busy');
		}
	},40);
}

$('chooseStandardCountSheetMode').addEventListener('click',()=>selectCountSheetMode('standard'));
$('chooseManualCountSheetMode').addEventListener('click',()=>selectCountSheetMode('manual'));
$('changeCountSheetMode').addEventListener('click',()=>selectCountSheetMode('selection'));
$('importCountSheetInventory').addEventListener('click',()=>{
	$('countSheetPanel').hidden=true;
	$('introRow')?.removeAttribute('hidden');
	$('stepper')?.removeAttribute('hidden');
	showStep(1);
});
$('generateCountSheetPreview').addEventListener('click',()=>{
	if(!getSelectedPrintOptions().length){
		clearCountSheetPreview();
		toast(`Select at least one ${getPrintMode()==='category'?'category':'supplier'} before generating a preview.`);
		return;
	}
	queueCountSheetPreview('Generating count-sheet preview…');
});

function getSupplierOptions(){
	return [...new Set((items||[]).map(item=>item.supplier||'Unassigned Supplier'))].sort();
}

function getInventoryPrintSignature(){
	const source=JSON.stringify((items||[]).map(item=>[
		item.supplier||'Unassigned Supplier',item.category||item.subdeptName||item.classification||'Uncategorized',
		item.ccdNo||item.ccd||'',item.departmentCode||item.deptCode||'',
		item.sku||'',item.barcode||'',item.description||'',item.locator||''
	]).sort((left,right)=>JSON.stringify(left).localeCompare(JSON.stringify(right))));
	let hash=2166136261;
	for(let index=0;index<source.length;index++)hash=Math.imul(hash^source.charCodeAt(index),16777619);
	return `${(hash>>>0).toString(36)}-${source.length}`;
}

function getPrintStatusScopeKey(){
	return JSON.stringify({
		mode:getPrintMode(),
		ccd:$('countSheetCcdFilter')?.value||'all',
		department:$('countSheetDepartmentFilter')?.value||'all'
	});
}

function getPrintedCombinedSuppliers(scopeKey=getPrintStatusScopeKey()){
	try{
		const saved=JSON.parse(localStorage.getItem('danne-lozana-printed-suppliers')||'null');
		if(saved?.signature===getInventoryPrintSignature()&&Array.isArray(saved.scopes?.[scopeKey]))return new Set(saved.scopes[scopeKey]);
	}catch(error){localStorage.removeItem('danne-lozana-printed-suppliers')}
	return new Set();
}

function markCombinedSuppliersPrinted(suppliers,signature=getInventoryPrintSignature(),scopeKey=getPrintStatusScopeKey()){
	if(signature!==getInventoryPrintSignature())return false;
	let saved;
	try{saved=JSON.parse(localStorage.getItem('danne-lozana-printed-suppliers')||'null')}
	catch(error){localStorage.removeItem('danne-lozana-printed-suppliers')}
	const scopes=saved?.signature===signature&&saved.scopes&&typeof saved.scopes==='object'?saved.scopes:{};
	const printed=getPrintedCombinedSuppliers(scopeKey);
	suppliers.forEach(supplier=>printed.add(supplier));
	try{
		localStorage.setItem('danne-lozana-printed-suppliers',JSON.stringify({
			signature,
			scopes:{...scopes,[scopeKey]:[...printed]}
		}));
	}catch(error){
		console.error('Could not save count-sheet print status:',error);
		return false;
	}
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

function getPrintMode(){
	return $('countSheetPrintMode')?.value==='supplier'?'supplier':'category';
}

function getSelectionGridOptions(){
	const ccd=$('countSheetCcdFilter')?.value||'all';
	const department=$('countSheetDepartmentFilter')?.value||'all';
	return getPrintMode()==='category'
		?CountSheetFilters.getDepartmentCategoryOptions(items,{ccd,department})
		:CountSheetFilters.getDepartmentSupplierOptions(items,{ccd,department});
}

function getSelectedPrintOptions(){
	const options=getSelectionGridOptions();
	if(!options.length)return [];
	const key=`danne-lozana-selected-${getPrintMode()}`;
	let saved;
	try{saved=JSON.parse(localStorage.getItem(key)||'null')}
	catch(error){localStorage.removeItem(key)}
	const selected=Array.isArray(saved)?saved.filter(value=>options.includes(value)):[];
	return options.filter(value=>selected.includes(value));
}

function getCombinedGroupOptions(){
	const mode=$('supplierGroupingMode')?.value||'all';
	const combineMode=$('combineGroupOptionsFilter')?.value||'separate';
	if(combineMode==='combined'){
		if(mode==='category')return ['ALL_CATEGORIES_COMBINED'];
		if(mode==='supplier')return ['ALL_SUPPLIERS_COMBINED'];
		if(mode==='supplier-category')return ['ALL_SUPPLIERS_AND_CATEGORIES_COMBINED'];
	}
	const selected=getSelectedPrintOptions();
	if(mode==='supplier-category'){
		const ccd=$('countSheetCcdFilter')?.value||'all';
		const department=$('countSheetDepartmentFilter')?.value||'all';
		return selected.flatMap(supplier=>CountSheetFilters.getDepartmentCategoryOptions(items,{ccd,department,supplier})
			.map(category=>`${supplier} - ${category}`));
	}
	return selected;
}

function getSelectedCombinedSuppliers(){
	const options=getCombinedGroupOptions();
	return options;
}

function setCombinedSuppliers(selected){
	const options=getSelectionGridOptions();
	const key=`danne-lozana-selected-${getPrintMode()}`;
	localStorage.setItem(key,JSON.stringify(options.filter(value=>selected.includes(value))));
	syncSupplierSelectionList();
	if(selected.length)queueCountSheetPreview('Updating selected count-sheet groups…');
	else{
		clearCountSheetPreview();
	}
}

function syncSupplierSelectionList(){
	const list=$('supplierSelectionList');
	if(!list)return;
	if(!isStandardCountSheetMode()){
		list.hidden=true;
		return;
	}
	const mode=getPrintMode();
	const options=getSelectionGridOptions();
	const printedSuppliers=getPrintedCombinedSuppliers();
	const availableOptions=options.filter(value=>!printedSuppliers.has(value));
	const selectedOptions=getSelectedPrintOptions().filter(value=>!printedSuppliers.has(value));
	const selectedSet=new Set(selectedOptions);
	list.hidden=false;
	list.innerHTML='';
	if(!options.length){
		const empty=document.createElement('p');
		empty.className='supplier-selection-empty';
		empty.textContent=`No ${mode==='category'?'categories':'suppliers'} match the selected CCD and department.`;
		list.appendChild(empty);
		['printSheetBtn','exportSheetBtn'].forEach(id=>{const button=$(id);if(button)button.disabled=true});
		return;
	}
	const actions=document.createElement('div');
	actions.className='supplier-selection-actions';
	const selectAll=document.createElement('button');
	selectAll.type='button';
	selectAll.className='supplier-selection-action';
	selectAll.textContent=`Select All ${mode==='category'?'Categories':'Suppliers'}`;
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
		button.dataset.selection=value;
		button.disabled=isPrinted;
		button.setAttribute('aria-pressed',String(!isPrinted&&selectedSet.has(value)));
		button.setAttribute('aria-label',`${selectedSet.has(value)?'Deselect':'Select'} ${mode==='category'?'category':'supplier'} ${value}`);
		button.textContent=value;
		if(isPrinted){
			const tag=document.createElement('span');
			tag.className='supplier-printed-tag';
			tag.textContent='PRINTED';
			button.appendChild(tag);
		}
		button.addEventListener('click',()=>{
			if(isPrinted)return;
			const current=getSelectedPrintOptions().filter(item=>!printedSuppliers.has(item));
			const next=current.includes(value)?current.filter(item=>item!==value):[...current,value];
			setCombinedSuppliers(next);
		});
		list.appendChild(button);
	});
	const printable=selectedOptions.length;
	['printSheetBtn','exportSheetBtn'].forEach(id=>{
		const button=$(id); if(button)button.disabled=printable===0;
	});
}

function updateGroupModeControl(){
	const control=$('countSheetGroupMode');
	if(!control)return;
	const printMode=getPrintMode();
	const groupMode=$('supplierGroupingMode')?.value||'all';
	const isCombined=$('combineGroupOptionsFilter')?.value==='combined';
	const options=printMode==='category'
		?[
			['category-separate','One category per sheet'],
			['category-combined','Combine into single continuous sheet']
		]
		:[
			['supplier-separate','One supplier per sheet'],
			['supplier-combined','Combine into single continuous sheet'],
			['supplier-category','Group by Supplier + Category']
		];
	const current=groupMode==='supplier-category'?'supplier-category':`${printMode}-${isCombined?'combined':'separate'}`;
	control.replaceChildren(...options.map(([value,label])=>new Option(label,value)));
	control.value=options.some(([value])=>value===current)?current:options[0][0];
	setGroupModeFromControl();
}

function setGroupModeFromControl(){
	const value=$('countSheetGroupMode')?.value||'category-separate';
	const groupMode=value==='supplier-category'?'supplier':value.startsWith('category-')?'category':'supplier';
	$('supplierGroupingMode').value=value==='supplier-category'?'supplier-category':groupMode;
	$('combineGroupOptionsFilter').value=value.endsWith('-combined')?'combined':'separate';
}

paperSizeControl.querySelector('option[value="letter"]').textContent='Short bond · Letter (8.5 x 11 in)';
paperSizeControl.querySelector('option[value="legal"]').textContent='Legal · 8.5 x 14 in';
paperSizeControl.add(new Option('Long bond · Folio (8.5 x 13 in)','folio'));
function saveLayoutSettings(){const values={};layoutControlIds.forEach(id=>{const control=document.getElementById(id);values[id]=control.type==='checkbox'?control.checked:control.value});localStorage.setItem('danne-lozana-count-layout',JSON.stringify(values))}
function restoreLayoutSettings(){try{const values=JSON.parse(localStorage.getItem('danne-lozana-count-layout')||'{}');layoutControlIds.forEach(id=>{const control=document.getElementById(id);if(values[id]===undefined)return;if(control.type==='checkbox')control.checked=values[id];else{if(id==='rowsPerPage'&&!Array.from(control.options).some(option=>option.value===String(values[id]))){control.add(new Option(`${values[id]} rows`,String(values[id])))}control.value=values[id]}})}catch(error){localStorage.removeItem('danne-lozana-count-layout')}
if(typeof applyLayout==='function')applyLayout(false);if(typeof refreshLayoutPreview==='function')refreshLayoutPreview()}
restoreLayoutSettings();
updateGroupModeControl();
layoutControlIds.forEach(id=>{const control=document.getElementById(id);control.addEventListener('change',()=>{saveLayoutSettings();if(typeof recordLocalHistory==='function')recordLocalHistory('Layout changed',`${id}: ${control.type==='checkbox'?control.checked:control.value}`)});control.addEventListener('input',saveLayoutSettings)});
$('configureSheetBtn').onclick=()=>{showStep(3);refreshLayoutPreview()};

function updateSupplierFilter(){
	const filter=$('supplierFilter');
	if(!filter)return;
	if(!isStandardCountSheetMode())return;
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
$('supplierFilter').addEventListener('change',()=>{
	if(!isStandardCountSheetMode())return;
	updateCountSheetCategoryFilter();
	if(countSheetPreviewRequested)queueCountSheetPreview();
});
$('countSheetPrintMode')?.addEventListener('change',()=>{
	if(!isStandardCountSheetMode())return;
	updateGroupModeControl();
	syncSupplierSelectionList();
	if(countSheetPreviewRequested)queueCountSheetPreview();
	saveLayoutSettings();
});
$('countSheetGroupMode')?.addEventListener('change',()=>{
	if(!isStandardCountSheetMode())return;
	setGroupModeFromControl();
	syncSupplierSelectionList();
	if(countSheetPreviewRequested)queueCountSheetPreview();
	saveLayoutSettings();
});
$('supplierGroupingMode')?.addEventListener('change',()=>{if(!isStandardCountSheetMode())return;updateGroupModeControl();syncSupplierSelectionList();if(countSheetPreviewRequested)queueCountSheetPreview();saveLayoutSettings()});
$('combineGroupOptionsFilter')?.addEventListener('change',()=>{if(!isStandardCountSheetMode())return;updateGroupModeControl();syncSupplierSelectionList();if(countSheetPreviewRequested)queueCountSheetPreview();saveLayoutSettings()});
$('countSheetCategoryFilter').addEventListener('change',()=>{
	if(!isStandardCountSheetMode())return;
	updateSupplierFilter();
	syncSupplierSelectionList();
	if(countSheetPreviewRequested)queueCountSheetPreview();
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
	if(!localStorage.getItem('danne-lozana-count-layout'))rowsSelect.value='9';
	const rowsInput=document.createElement('input');
	rowsInput.type='number';rowsInput.id='rowsPerPageFree';rowsInput.min='1';rowsInput.max='30';rowsInput.value=rowsSelect.value;rowsInput.title='Type any number of rows';rowsInput.style.marginTop='6px';
	rowsSelect.parentElement.appendChild(rowsInput);
	const presetWrap=document.createElement('div');presetWrap.className='rows-presets';
	[5,7,9,10,15,20,25,30].forEach(value=>{const button=document.createElement('button');button.type='button';button.textContent=value;button.dataset.rows=value;button.onclick=()=>{rowsInput.value=value;rowsSelect.value=String(value);if(!Array.from(rowsSelect.options).some(option=>option.value===String(value)))rowsSelect.add(new Option(`${value} rows`,String(value)));rowsSelect.dispatchEvent(new Event('change'));refreshLayoutPreview();saveLayoutSettings()};presetWrap.appendChild(button)});
	rowsSelect.parentElement.appendChild(presetWrap);
	const estimate=document.createElement('small');estimate.id='paperUseEstimate';estimate.style.display='block';estimate.style.marginTop='7px';estimate.style.color='#66726b';rowsSelect.parentElement.appendChild(estimate);
	rowsSelect.addEventListener('change',updatePaperUseEstimate);
	rowsInput.addEventListener('input',()=>{const value=Math.max(1,Math.min(30,Number(rowsInput.value)||1));rowsSelect.value=String(value);if(!Array.from(rowsSelect.options).some(option=>option.value===String(value)))rowsSelect.add(new Option(`${value} rows`,String(value)));rowsSelect.dispatchEvent(new Event('change'));saveLayoutSettings();refreshLayoutPreview()});
	updatePaperUseEstimate();
}
[$('paperSize'),$('orientation')].forEach(control=>control.addEventListener('change',updatePaperUseEstimate));
