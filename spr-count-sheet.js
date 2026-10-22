(() => {
  const upload = $('uploadSprCountSheet');
  const input = $('sprCountSheetFile');
  const print = $('printSprCountSheet');
  const pdf = $('exportSprCountSheet');
  const status = $('sprCountSheetStatus');
  const pages = $('sprCountSheetPages');
  let rows = [];
  let fileName = '';
  const pageSize = 14;

  function render() {
    const totalPages = Math.ceil(rows.length / pageSize);
    const store = $('storeField').value.trim();
    const date = $('dateField').value || new Date().toLocaleDateString();
    const esc = escapeSheetText;
    pages.innerHTML = Array.from({length: totalPages}, (_, page) => {
      const offset = page * pageSize;
      const entries = rows.slice(offset, offset + pageSize);
      return `<article class="count-sheet-page spr-sheet">
        <header class="spr-sheet-heading"><h3>FOR SPR</h3><p>PHYSICAL INVENTORY COUNT SHEET</p>
          <div class="spr-sheet-meta"><span>${store ? `STORE: ${esc(store)}` : ''}</span><span>DATE: ${esc(date)}</span></div>
          <div class="spr-sheet-meta"><span>${esc(fileName)}</span><span>PAGE ${page + 1} OF ${totalPages}</span></div></header>
        <table class="spr-table"><thead><tr><th scope="col">#</th><th scope="col">SKU</th><th scope="col">BARCODE</th><th scope="col">DESCRIPTION</th><th scope="col">COUNT</th></tr></thead>
          <tbody>${entries.map((row, index) => `<tr><td>${offset + index + 1}</td><td>${esc(row.sku)}</td><td>${row.barcode ? `<svg class="scan-barcode" data-barcode="${esc(row.barcode)}"></svg>` : '<span class="spr-missing-barcode">No barcode</span>'}</td><td>${esc(row.description)}</td><td><span class="spr-count-line"></span></td></tr>`).join('')}</tbody></table>
        <footer class="spr-signoff"><span>COUNTER: ____________________</span><span>VALIDATOR: ____________________</span></footer>
      </article>`;
    }).join('');
    drawCountSheetBarcodes(pages);
  }

  upload.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    upload.disabled = print.disabled = pdf.disabled = true;
    $('sprCountSheetMode').setAttribute('aria-busy', 'true');
    status.textContent = `Reading ${file.name}…`;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Use a file smaller than 20 MB.');
      const imported = await readImportedCountSheet(file);
      if (imported.length > 50000) throw new Error('Split files larger than 50,000 rows into smaller files.');
      const nextRows = imported.map((row, index) => {
        if (!row.sku || !row.description) throw new Error(`Row ${index + 2}: SKU and DESCRIPTION are required. Check your column headings and values.`);
        return {sku: row.sku, barcode: row.barcode, description: row.description};
      });
      rows = nextRows;
      fileName = file.name;
      render();
      const missing = rows.filter(row => !row.barcode).length;
      status.textContent = `${fileName} · ${rows.length.toLocaleString()} rows · ${Math.ceil(rows.length / pageSize)} portrait page(s)${missing ? ` · ${missing} row(s) without a barcode` : ''}. Ready to print.`;
    } catch (error) {
      status.textContent = `Could not load file: ${error.message}${rows.length ? ` Previous file still shown: ${fileName}.` : ''}`;
    } finally {
      upload.disabled = false;
      print.disabled = pdf.disabled = !rows.length;
      $('sprCountSheetMode').removeAttribute('aria-busy');
      input.value = '';
    }
  });

  window.prepareSprCountSheetPrint = () => {
    if (!rows.length) return false;
    render();
    document.body.classList.add('print-count-sheet', 'print-spr-count-sheet');
    return true;
  };
  function printSheet() {
    if (!window.prepareSprCountSheetPrint()) return;
    requestAnimationFrame(() => window.print());
  }
  print.addEventListener('click', printSheet);
  pdf.addEventListener('click', printSheet);
})();
