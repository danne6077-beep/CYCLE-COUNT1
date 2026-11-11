(() => {
  const upload = $('uploadSprCountSheet');
  const input = $('sprCountSheetFile');
  const print = $('printSprCountSheet');
  const pdf = $('exportSprCountSheet');
  const status = $('sprCountSheetStatus');
  const pages = $('sprCountSheetPages');
  const categoryFilter = $('sprCategoryFilter');
  const categoryList = $('sprCategorySelectionList');
  const categoryActions = categoryList.firstElementChild;
  const selectAllCategories = $('sprSelectAllCategories');
  const clearCategories = $('sprClearCategories');
  const categoryOrder = $('sprCategoryOrder');
  const categoryOrderList = $('sprCategoryOrderList');
  let excelReady;
  function ensureExcel() {
    if(typeof window.XLSX?.read==='function')return Promise.resolve();
    if(!excelReady)excelReady=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=new URL('spr-vendor/xlsx.full.min.js',document.baseURI).href;
      script.onload=()=>typeof window.XLSX?.read==='function'?resolve():reject(new Error('The Excel reader did not initialize. Try the CSV template.'));
      script.onerror=()=>reject(new Error('The Excel reader could not load. Check your connection and retry, or use the CSV template.'));
      document.head.append(script);
    }).catch(error=>{excelReady=null;throw error});
    return excelReady;
  }
  const templateRows = [
    ['SKU', 'BARCODE', 'DESCRIPTION', 'CATEGORY', 'SUPPLIER'],
    ['000001', '036000291452', 'Example product - replace this row', 'Groceries', 'Example Supplier A'],
    ['000002', '012345678905', 'Another example - replace this row', 'Household', 'Example Supplier B']
  ];
  const templateExcel=document.createElement('button');templateExcel.id='downloadSprExcelTemplate';templateExcel.type='button';templateExcel.className='secondary-button';templateExcel.textContent='Download Excel template';
  const templateCsv=document.createElement('button');templateCsv.id='downloadSprCsvTemplate';templateCsv.type='button';templateCsv.className='secondary-button';templateCsv.textContent='Download CSV template';
  upload.after(templateExcel,templateCsv);
  const instructions=document.createElement('p');instructions.className='spr-upload-help';instructions.textContent='Replace the example rows and keep the SKU, BARCODE, DESCRIPTION, CATEGORY, and SUPPLIER headers. Fill in CATEGORY to print by category. SUPPLIER is optional and appears on combined category sheets. Keep SKU and BARCODE as Text to retain leading zeros. No locator or CCD is required. Supported: .xlsx, .xls, .xlsm, .csv.';status.before(instructions);
  templateCsv.addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob(['\uFEFF'+templateRows.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='FOR-SPR-upload-template.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  templateExcel.addEventListener('click',async()=>{
    templateExcel.disabled=true;
    try{await ensureExcel();const workbook=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet(templateRows);sheet['!cols']=[{wch:18},{wch:24},{wch:60},{wch:24},{wch:30}];for(const address of ['A2','A3','B2','B3'])sheet[address].z='@';XLSX.utils.book_append_sheet(workbook,sheet,'FOR SPR');XLSX.writeFile(workbook,'FOR-SPR-upload-template.xlsx');}
    catch(error){status.textContent=error.message}finally{templateExcel.disabled=false}
  });
  let rows = [];
  let fileName = '';
  const categoryKey = row => `category:${row.category.toLowerCase()}`;
  let categories = new Map();
  let selectedCategories = [];
  const usesCategoryOrder = () => ['combined', 'separate'].includes(categoryFilter.value);
  const settingsKey = 'fuji-spr-layout-settings-v1';
  const presetsKey = 'fuji-spr-layout-presets-v1';
  const defaults = {perPage:15,orientation:'portrait',paper:'a4',columns:{sku:true,barcode:true,description:true,count:true},density:'normal',font:'medium',barcode:'medium',margins:'normal',fields:true,bands:true,footer:true};
  const columns = [['sku','SKU'],['barcode','Barcode'],['description','Description'],['count','Final Count']];
  const sizes = {a4:[210,297],letter:[215.9,279.4],legal:[215.9,355.6]};
  const marginSizes = {narrow:6,normal:10,wide:16};
  const esc = escapeSheetText;
  function normalize(value = {}) {
    if(!value||typeof value!=='object')value={};
    const next = {...defaults,columns:{...defaults.columns}};
    next.perPage = Math.max(1,Math.min(250,Math.floor(Number(value.perPage)||defaults.perPage)));
    for (const [key,choices] of Object.entries({orientation:['portrait','landscape'],paper:Object.keys(sizes),density:['compact','normal','roomy'],font:['small','medium','large'],barcode:['small','medium','large'],margins:Object.keys(marginSizes)})) if (choices.includes(value[key])) next[key] = value[key];
    for (const key of ['fields','bands','footer']) if (typeof value[key] === 'boolean') next[key] = value[key];
    for (const [key] of columns) if (typeof value.columns?.[key] === 'boolean') next.columns[key] = value.columns[key];
    if (!Object.values(next.columns).some(Boolean)) next.columns.sku = true;
    return next;
  }
  function readSaved(key,fallback) {try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
  let settings = normalize(readSaved(settingsKey,defaults));
  let presets = readSaved(presetsKey,[]);
  if (!Array.isArray(presets)) presets = [];
  presets = presets.filter(item=>item&&typeof item.name==='string').slice(0,20).map(item=>({name:item.name.slice(0,60),settings:normalize(item.settings)}));
  const workspace = document.createElement('div');
  workspace.className = 'spr-layout-workspace';
  const panel = document.createElement('details');
  panel.className = 'spr-layout-settings'; panel.open = !matchMedia('(max-width: 700px)').matches;
  const select = (key,label,options) => `<label>${label}<select data-spr-setting="${key}">${options.map(([value,title])=>`<option value="${value}">${title}</option>`).join('')}</select></label>`;
  panel.innerHTML = '<summary>Layout Settings</summary><div class="spr-layout-controls"><label>SKUs per page<input data-spr-setting="perPage" type="number" min="1" max="250" step="1"></label><div class="spr-page-presets" aria-label="SKUs per page presets">'+[10,15,20,25,30].map(value=>`<button type="button" data-spr-page-preset="${value}">${value}</button>`).join('')+'<button type="button" data-spr-custom>Custom</button></div>'+
    select('orientation','Orientation',[['portrait','Portrait'],['landscape','Landscape']])+select('paper','Paper size',[['a4','A4'],['letter','Letter'],['legal','Legal']])+
    '<fieldset><legend>Columns</legend>'+columns.map(([key,label])=>`<label class="spr-layout-check"><input type="checkbox" data-spr-column="${key}">${label}</label>`).join('')+'</fieldset>'+
    select('density','Row height',[['compact','Compact'],['normal','Normal'],['roomy','Roomy']])+select('font','Font size',[['small','Small'],['medium','Medium'],['large','Large']])+select('barcode','Barcode size',[['small','Small'],['medium','Medium'],['large','Large']])+select('margins','Margins',[['narrow','Narrow'],['normal','Normal'],['wide','Wide']])+
    '<fieldset><legend>Show or hide</legend>'+[['fields','Header fields'],['bands','Department bands'],['footer','Footer']].map(([key,label])=>`<label class="spr-layout-check"><input type="checkbox" data-spr-setting="${key}">${label}</label>`).join('')+'</fieldset><fieldset><legend>Saved presets</legend><label>Preset name<input id="sprPresetName" maxlength="60" autocomplete="off"></label><button type="button" class="secondary-button" id="sprSavePreset">Save current settings</button><label>Saved preset<select id="sprSavedPreset"><option value="">Choose preset</option></select></label><div class="spr-preset-actions"><button type="button" class="secondary-button" id="sprLoadPreset">Load</button><button type="button" class="secondary-button" id="sprDeletePreset">Delete</button></div></fieldset><button type="button" class="secondary-button" id="sprResetLayout">Reset to defaults</button><p id="sprLayoutMessage" role="status" aria-live="polite"></p></div>';
  const preview = document.createElement('div');preview.className = 'spr-preview-scroll';
  pages.before(workspace); workspace.append(panel,preview);preview.append(pages);
  const pageRule = document.createElement('style');pageRule.id = 'sprLayoutPageRule';document.head.append(pageRule);
  function message(text) { $('sprLayoutMessage').textContent = text; }
  function persist() {try{localStorage.setItem(settingsKey,JSON.stringify(settings))}catch{message('Settings could not be saved in this browser.')}}
  function syncControls() {
    panel.querySelectorAll('[data-spr-setting]').forEach(input=>{const value=settings[input.dataset.sprSetting];if(input.type==='checkbox')input.checked=value;else input.value=value});
    panel.querySelectorAll('[data-spr-column]').forEach(input=>input.checked=settings.columns[input.dataset.sprColumn]);
    panel.querySelectorAll('[data-spr-page-preset]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.sprPagePreset)===settings.perPage)));
  }
  function syncPresets(selected='') {
    $('sprSavedPreset').replaceChildren(new Option('Choose preset',''),...presets.map((preset,index)=>new Option(preset.name,String(index))));$('sprSavedPreset').value=selected;
  }
  function changed() {settings=normalize(settings);syncControls();persist();message('');render();}
  panel.addEventListener('input',event=>{const input=event.target;if(!input.matches('[data-spr-setting],[data-spr-column]'))return;if(input.type==='number'&&!input.value)return;
    if(input.dataset.sprColumn){if(!input.checked&&Object.values(settings.columns).filter(Boolean).length===1){input.checked=true;message('Keep at least one column visible.');return}settings.columns[input.dataset.sprColumn]=input.checked}
    else settings[input.dataset.sprSetting]=input.type==='checkbox'?input.checked:input.value;changed();
  });
  panel.querySelectorAll('[data-spr-page-preset]').forEach(button=>button.addEventListener('click',()=>{settings.perPage=Number(button.dataset.sprPagePreset);changed()}));
  panel.querySelector('[data-spr-custom]').addEventListener('click',()=>panel.querySelector('[data-spr-setting="perPage"]').focus());
  $('sprResetLayout').addEventListener('click',()=>{settings=normalize();changed();message('Default layout restored.');});
  function savePresets() {try{localStorage.setItem(presetsKey,JSON.stringify(presets));return true}catch{message('Presets could not be saved in this browser.');return false}}
  $('sprSavePreset').addEventListener('click',()=>{const name=$('sprPresetName').value.trim();if(!name){message('Enter a preset name.');return}const index=presets.findIndex(item=>item.name===name);if(index<0&&presets.length>=20){message('Delete a preset before saving another (maximum 20).');return}const preset={name,settings:normalize(settings)};if(index<0)presets.push(preset);else presets[index]=preset;if(savePresets()){syncPresets(String(index<0?presets.length-1:index));message('Preset saved.');}});
  $('sprLoadPreset').addEventListener('click',()=>{const preset=presets[Number($('sprSavedPreset').value)];if($('sprSavedPreset').value===''||!preset)return;settings=normalize(preset.settings);changed();message('Preset loaded.');});
  $('sprDeletePreset').addEventListener('click',async()=>{const index=$('sprSavedPreset').value;if(index==='')return;const approved=await(window.fujiConfirm?.('Delete this saved SPR layout preset?','Delete layout preset')??Promise.resolve(window.confirm('Delete this saved SPR layout preset?')));if(!approved)return;presets.splice(Number(index),1);if(savePresets()){syncPresets();message('Preset deleted.');}});
  function geometry() {const dimensions=[...sizes[settings.paper]];if(settings.orientation==='landscape')dimensions.reverse();return {width:dimensions[0],height:dimensions[1],margin:marginSizes[settings.margins]};}
  function applySettings() {
    const {width,height,margin}=geometry();
    const values={'paper-width':`${width}mm`,'paper-height':`${height}mm`,'margin':`${margin}mm`,'row-height':`${{compact:40,normal:52,roomy:68}[settings.density]}px`,'font':`${{small:10,medium:11,large:13}[settings.font]}px`,'barcode-height':`${{small:36,medium:42,large:50}[settings.barcode]}px`};
    Object.entries(values).forEach(([key,value])=>pages.style.setProperty(`--spr-${key}`,value));
    document.querySelector('#sprCountSheetMode .status-pill').textContent=`${settings.paper.toUpperCase()} · ${settings.orientation==='portrait'?'Portrait':'Landscape'}`;
  }
  function metadataValue(row,names) {const key=Object.keys(row||{}).find(key=>names.includes(key.toLowerCase().replace(/[^a-z0-9]/g,'')));return key?String(row[key]??'').trim():'';}
  function updateCategorySelection() {
    const selected = new Set(selectedCategories);
    for (const button of categoryList.querySelectorAll('[data-category]')) {
      const pressed = selected.has(button.dataset.category);
      button.classList.toggle('is-selected', pressed);
      button.setAttribute('aria-pressed', String(pressed));
    }
    selectAllCategories.disabled = selected.size === categories.size;
    clearCategories.disabled = selected.size === 0;
    categoryList.hidden = !usesCategoryOrder();
    categoryOrder.hidden = categoryList.hidden || selected.size === 0;
    if (categoryOrder.hidden) {
      categoryOrderList.replaceChildren();
      return;
    }

    const orderRows = document.createDocumentFragment();
    selectedCategories.forEach((key, index) => {
      const item = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'spr-category-order-row';
      const label = document.createElement('span');
      label.textContent = categories.get(key);
      const actions = document.createElement('div');
      actions.className = 'spr-category-order-actions';
      for (const [direction, offset] of [['up', -1], ['down', 1]]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary-button';
        button.textContent = `Move ${direction}`;
        button.setAttribute('aria-label', `Move ${label.textContent} ${direction}`);
        const next = index + offset;
        button.disabled = next < 0 || next >= selectedCategories.length;
        button.addEventListener('click', () => {
          [selectedCategories[index], selectedCategories[next]] = [selectedCategories[next], selectedCategories[index]];
          updateCategorySelection();
          render();
          const buttons = categoryOrderList.children[next].querySelectorAll('button');
          const nextButton = buttons[offset === -1 ? 0 : 1];
          (nextButton.disabled ? buttons[offset === -1 ? 1 : 0] : nextButton).focus({preventScroll:true});
        });
        actions.append(button);
      }
      row.append(label, actions);
      item.append(row);
      orderRows.append(item);
    });
    categoryOrderList.replaceChildren(orderRows);
  }

  function syncCategoryFilter() {
    const labels = new Map();
    for (const row of rows) {
      const key = categoryKey(row);
      if (!labels.has(key)) labels.set(key, row.category);
    }
    categories = new Map([...labels].sort((a, b) => a[1].localeCompare(b[1])));
    const options = [...categories].map(([key, label]) => new Option(label, key));
    if (categories.size > 1) {
      options.push(
        new Option('Combine into single continuous sheet', 'combined'),
        new Option('One category per sheet', 'separate')
      );
    }
    categoryFilter.replaceChildren(new Option('All categories', ''), ...options);
    selectedCategories = [];
    categoryList.replaceChildren(categoryActions);

    if (categories.size > 1) {
      const buttons = document.createDocumentFragment();
      for (const [key, label] of categories) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'supplier-combine-option';
        button.dataset.category = key;
        button.textContent = label;
        button.title = label;
        button.addEventListener('click', () => {
          const index = selectedCategories.indexOf(key);
          if (index >= 0) selectedCategories.splice(index, 1);
          else selectedCategories.push(key);
          updateCategorySelection();
          render();
        });
        buttons.append(button);
      }
      categoryList.append(buttons);
    }
    updateCategorySelection();
  }
  function sheetHeader(scopeRows, branch, category) {
    const store = $('storeField').value.trim() || '—';
    const ccdNumbers = [...new Set(scopeRows.map(row => row.ccdNo).filter(Boolean))].join(', ') || '—';
    const fields=[['Store',store],['Branch',branch||'—'],['CCD No.',ccdNumbers],['Category',category],['Date',$('dateField').value||new Date().toLocaleDateString()],['Prepared by',$('editorName')?.value||'—']];
    return `<header class="spr-sheet-heading"><h3>Cycle Count Sheet</h3>${settings.fields?`<div class="spr-header-fields">${fields.map(([label,value])=>`<div><b>${esc(label)}</b><span>${esc(value)}</span></div>`).join('')}</div>`:''}</header>`;
  }
  function group(index, showCategoryBands) {
    const row = rows[index];
    const department = settings.bands ? row.department : '';
    const ccd = settings.bands ? row.ccdNo : '';
    const category = showCategoryBands ? categoryKey(row) : '';
    const supplier = showCategoryBands ? row.supplier : '';
    const label = showCategoryBands ? [`Category: ${categories.get(category)} · Supplier: ${supplier}`] : [];
    if (settings.bands) label.push(`Department: ${department || '—'} · CCD No.: ${ccd || '—'}`);
    return {key: JSON.stringify([category, supplier, department, ccd]), label: label.join(' · ')};
  }
  function rowMarkup(index) {
    const row=rows[index];const cells={sku:esc(row.sku),barcode:row.barcode?`<svg class="scan-barcode" data-barcode="${esc(row.barcode)}"></svg>`:'<span class="spr-missing-barcode">No barcode</span>',description:esc(row.description),count:'<span class="spr-count-box"></span>'};
    return `<tr data-spr-row="${index}">${columns.filter(([key])=>settings.columns[key]).map(([key])=>`<td data-spr-cell="${key}">${cells[key]}</td>`).join('')}</tr>`;
  }
  function pageMarkup(indexes, page, total, header, branch, showCategoryBands) {
    const selected=columns.filter(([key])=>settings.columns[key]);let previous='';
    const body=indexes.map(index=>{const current=group(index,showCategoryBands);const band=current.label&&current.key!==previous?`<tr class="spr-department-band" data-spr-band="${index}"><td colspan="${selected.length}">${esc(current.label)}</td></tr>`:'';previous=current.key;return band+rowMarkup(index)}).join('');
    return `<article class="count-sheet-page spr-sheet">${header}<table class="spr-table"><colgroup>${selected.map(([key])=>`<col data-spr-col="${key}">`).join('')}</colgroup><thead><tr>${selected.map(([,label])=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>${settings.footer?`<footer class="spr-sheet-footer"><span>${esc([$('storeField').value.trim(),branch].filter(Boolean).join(' · '))}</span><span>Page ${page} of ${total}</span></footer>`:''}</article>`;
  }
  function sizeBarcodes(root) {
    drawCountSheetBarcodes(root);
    root.querySelectorAll('.scan-barcode').forEach(svg=>{const natural=Number(svg.getAttribute('width'))||140;svg.style.width=`${natural*{small:.9,medium:1,large:1.15}[settings.barcode]}px`;});
  }

  function paginate(indexes, category, showCategoryBands) {
    const scopeRows = indexes.map(index => rows[index]);
    const branch = metadataValue(scopeRows[0], ['branch', 'branchname']) || window.fujiWorkspaceSettings?.branchName || '';
    const header = sheetHeader(scopeRows, branch, category);
    const probe = document.createElement('div');
    probe.className = 'spr-measurement';
    probe.innerHTML = pageMarkup(indexes, 1, 1, header, branch, showCategoryBands);
    pages.append(probe);
    sizeBarcodes(probe);

    const {height, margin} = geometry();
    const headerHeight = probe.querySelector('.spr-sheet-heading').getBoundingClientRect().height;
    const tableHeaderHeight = probe.querySelector('thead').getBoundingClientRect().height;
    const footerHeight = settings.footer ? probe.querySelector('footer').getBoundingClientRect().height + 16 : 0;
    const available = (height - 2 * margin) * 96 / 25.4 - headerHeight - 12 - tableHeaderHeight - footerHeight - 8;
    const heights = new Map([...probe.querySelectorAll('[data-spr-row]')].map(row => [Number(row.dataset.sprRow), row.getBoundingClientRect().height]));
    const bands = new Map([...probe.querySelectorAll('[data-spr-band]')].map(row => [group(Number(row.dataset.sprBand), showCategoryBands).key, row.getBoundingClientRect().height]));
    probe.remove();

    const chunks = [];
    let chunk = [];
    let used = 0;
    let previous = '';
    let tooTall = false;
    for (const index of indexes) {
      const current = group(index, showCategoryBands);
      const rowHeight = heights.get(index);
      const bandHeight = current.label ? bands.get(current.key) || 25 : 0;
      let band = !chunk.length || previous !== current.key ? bandHeight : 0;
      if (chunk.length && (chunk.length >= settings.perPage || used + band + rowHeight > available)) {
        chunks.push(chunk);
        chunk = [];
        used = 0;
        band = bandHeight;
      }
      if (band + rowHeight > available) tooTall = true;
      chunk.push(index);
      used += band + rowHeight;
      previous = current.key;
    }
    if (chunk.length) chunks.push(chunk);
    return {chunks, header, branch, tooTall};
  }

  function render() {
    applySettings();
    if (!rows.length || $('sprCountSheetMode').hidden) return;

    const selected = categoryFilter.value;
    const ordered = usesCategoryOrder();
    const separate = selected === 'separate';
    const groups = new Map(selectedCategories.map(key => [key, []]));
    const ungrouped = [];
    rows.forEach((row, index) => {
      const key = categoryKey(row);
      if (ordered) groups.get(key)?.push(index);
      else if (!selected || key === selected) ungrouped.push(index);
    });
    const indexes = ordered ? [...groups.values()].flat() : ungrouped;
    if (!indexes.length) {
      pages.replaceChildren();
      print.disabled = pdf.disabled = true;
      status.textContent = 'Select at least one category to preview and print.';
      return;
    }

    let category = 'All categories';
    if (ordered) category = separate ? 'Separate categories' : 'Combined categories';
    else if (selected || categories.size === 1) category = rows[indexes[0]].category;
    const sections = separate
      ? [...groups].map(([key, categoryIndexes]) => ({indexes:categoryIndexes, category:categories.get(key)}))
      : [{indexes, category}];
    const sheets = [];
    let minimumPages = 0;
    let tooTall = false;
    for (const section of sections) {
      const result = paginate(section.indexes, section.category, ordered);
      tooTall ||= result.tooTall;
      minimumPages += Math.ceil(section.indexes.length / settings.perPage);
      for (const chunk of result.chunks) sheets.push({indexes:chunk, header:result.header, branch:result.branch});
    }
    pages.innerHTML = sheets.map((sheet, index) => pageMarkup(sheet.indexes, index + 1, sheets.length, sheet.header, sheet.branch, ordered)).join('');
    sizeBarcodes(pages);

    const tooWide = [...pages.querySelectorAll('.scan-barcode')].some(svg => svg.getBoundingClientRect().width > svg.closest('td').clientWidth - 12);
    print.disabled = pdf.disabled = tooTall || tooWide;
    const missing = indexes.filter(index => !rows[index].barcode).length;
    status.textContent=`${fileName}${selected ? ` · ${category}` : ''} · ${indexes.length.toLocaleString()} rows · ${sheets.length} ${settings.orientation} page(s)${missing?` · ${missing} row(s) without a barcode`:''}. ${tooTall?'A row is too tall for this paper. Use a smaller font or larger paper.':tooWide?'A barcode is too wide to print at a readable size. Choose larger paper, landscape, or hide another column.':'Ready to print.'}`;
    if (sheets.length > minimumPages) message('SKUs per page is a maximum. Additional pages keep rows and barcodes within the printable area.');
  }

  syncControls();syncPresets();applySettings();
  categoryFilter.addEventListener('change', () => {
    updateCategorySelection();
    render();
  });
  selectAllCategories.addEventListener('click', () => {
    selectedCategories = [...new Set([...selectedCategories, ...categories.keys()])];
    updateCategorySelection();
    render();
  });
  clearCategories.addEventListener('click', () => {
    selectedCategories = [];
    updateCategorySelection();
    render();
  });
  ['storeField','dateField','editorName'].forEach(id=>$(id)?.addEventListener('change',()=>{if(rows.length)render()}));
  $('chooseSprCountSheetMode').addEventListener('click',()=>setTimeout(render,0));

  upload.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const wasPrintDisabled=print.disabled;
    upload.disabled = categoryFilter.disabled = print.disabled = pdf.disabled = true;
    categoryList.inert = categoryOrder.inert = true;
    $('sprCountSheetMode').setAttribute('aria-busy', 'true');
    status.textContent = `Reading ${file.name}…`;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Use a file smaller than 20 MB.');
      const extension=file.name.split('.').pop().toLowerCase();
      if(!['xlsx','xls','xlsm','csv'].includes(extension))throw new Error('Choose an Excel (.xlsx, .xls, .xlsm) or CSV file using the SPR template.');
      if(extension!=='csv')await ensureExcel();
      const imported = await readImportedCountSheet(file);
      if (imported.length > 50000) throw new Error('Split files larger than 50,000 rows into smaller files.');
      imported.forEach((row, index) => {
        if (!row.sku || !row.description) throw new Error(`Row ${index + 2}: SKU and DESCRIPTION are required. Check your column headings and values.`);
      });
      rows = imported;
      syncCategoryFilter();
      fileName = file.name;
      render();
    } catch (error) {
      print.disabled=pdf.disabled=wasPrintDisabled;
      status.textContent = `Could not load file: ${error.message}${rows.length ? ` Previous file still shown: ${fileName}.` : ''}`;
    } finally {
      upload.disabled = false;
      categoryFilter.disabled = !rows.length;
      categoryList.inert = categoryOrder.inert = false;
      if(!rows.length)print.disabled=pdf.disabled=true;
      $('sprCountSheetMode').removeAttribute('aria-busy');
      input.value = '';
    }
  });

  window.prepareSprCountSheetPrint = () => {
    if (!rows.length || upload.disabled) return false;
    render();
    if(print.disabled)return false;
    const {width,height,margin}=geometry();
    pageRule.textContent=`@media print{@page{size:${width}mm ${height}mm;margin:${margin}mm}@page fuji-spr{size:${width}mm ${height}mm;margin:${margin}mm}}`;
    document.body.classList.add('print-count-sheet', 'print-spr-count-sheet');
    return true;
  };
  function printSheet() {
    if (!window.prepareSprCountSheetPrint()) return;
    requestAnimationFrame(() => window.print());
  }
  print.addEventListener('click', printSheet);
  pdf.addEventListener('click', printSheet);
  window.addEventListener('afterprint',()=>{pageRule.textContent=''});
})();
