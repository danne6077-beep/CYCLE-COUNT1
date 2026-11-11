window.CigarTrends = function({getState, openDay, deleteDay, exportCsv}){
  const $ = id => document.getElementById(id);
  const data = CigarMonitorData;
  const {addDays, localDate, validDate, formatNumber, formatSigned, dateLabel, totals, parseQuantity, validNumber} = data;
  const panel = $('cigarTrendsWorkspace');
  const rangeControls = $('cigarTrendRanges');
  const startDate = $('cigarTrendFrom');
  const endDate = $('cigarTrendTo');
  const skuSearch = $('cigarTrendSkuSearch');
  const skuSelect = $('cigarTrendSku');
  const charts = new Map();
  const dayMs = 86400000;
  const dayNumber = date => Date.parse(date)/dayMs;
  const fromDay = day => new Date(day*dayMs).toISOString().slice(0,10);
  const monthStart = date => date.slice(0,7)+'-01';
  let rangeMode = 'month';
  let currentRange;
  let chartLibrary;
  let renderVersion = 0;
  let stockChoices = [];
  let chartData;
  let selectedSku = '';

  function element(tag,text,className){
    const node = document.createElement(tag);
    if(text !== undefined) node.textContent = text;
    if(className) node.className = className;
    return node;
  }

  function icon(name){
    function build([tag,attrs,children = []]){
      const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
      for(const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
      children.forEach(child => node.append(build(child)));
      return node;
    }
    const source = window.FujiLucideIcons?.[name];
    if(!source) return '';
    const svg = build(source);
    svg.classList.add('ui-icon');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    return svg;
  }

  document.addEventListener('DOMContentLoaded',() => {
    document.querySelectorAll('#cigarsPanel [data-cigar-icon]').forEach(button => button.prepend(icon(button.dataset.cigarIcon)));
  });

  function loadLibrary(){
    if(window.Chart) return Promise.resolve(window.Chart);
    if(!chartLibrary) chartLibrary = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'cigar-vendor/chart.umd.min.js';
      script.onload = () => window.Chart ? resolve(window.Chart) : reject(new Error('Chart library did not initialize.'));
      script.onerror = () => {script.remove();reject(new Error('Chart library could not load.'));};
      document.head.append(script);
    }).catch(error => {chartLibrary = undefined;throw error;});
    return chartLibrary;
  }

  function rangeFor(today){
    if(rangeMode === 'custom'){
      return validDate(startDate.value) && validDate(endDate.value) && startDate.value <= endDate.value ?
        {from:startDate.value, to:endDate.value} : null;
    }
    const from = rangeMode === 'month' ? monthStart(today) : addDays(today,rangeMode === '7' ? -6 : -29);
    return {from, to:today};
  }

  function salesPeriod(records,from,to){
    let sales = null, days = 0;
    for(const record of records){
      if(record.date < from || record.date > to || record.figures.sales === null) continue;
      days++;
      sales = (sales ?? 0)+record.figures.sales;
    }
    return {sales, days};
  }

  function renderKpis(records, visible, products, today, stockDate){
    const byDate = new Map(records.map(record => [record.date,record]));
    const todaySales = byDate.get(today)?.figures.sales ?? null;
    const yesterdaySales = byDate.get(addDays(today,-1))?.figures.sales ?? null;
    const delta = todaySales === null || yesterdaySales === null ? null : todaySales-yesterdaySales;
    const week = salesPeriod(records,data.weekStart(today),today);
    const month = salesPeriod(records,monthStart(today),today);
    const varianceDays = visible.filter(record => record.figures.mismatches).length;
    const net = visible.reduce((sum,record) => sum+(record.figures.variance ?? 0),0);
    const stock = [...data.latestStock(records,stockDate)].filter(([,ending]) => ending <= 0);
    const negative = stock.filter(([,ending]) => ending < 0).length;
    const dayCount = count => formatNumber(count)+(count === 1 ? ' day with sales' : ' days with sales');
    const figures = [
      ['Today vs yesterday',formatNumber(todaySales),'Yesterday '+formatNumber(yesterdaySales)+(delta === null ? '' : ' · '+formatSigned(delta)+' pcs')],
      ['Week to date',formatNumber(week.sales),dayCount(week.days)+' · Mon–today'],
      ['Month to date',formatNumber(month.sales),dayCount(month.days)],
      ['Days with variance',visible.length ? formatNumber(varianceDays)+' of '+formatNumber(visible.length) : '—',
        visible.length ? 'Net '+formatSigned(net)+' pcs · SKU mismatches' : 'No saved days in range'],
      ['Zero or negative stock',formatNumber(stock.length)+' SKUs',formatNumber(negative)+' negative · '+formatNumber(stock.length-negative)+' zero · As of '+dateLabel(stockDate)]
    ];
    $('cigarTrendKpis').replaceChildren(...figures.map(([label,value,note],index) => {
      const card = element('article',undefined,'cigar-trend-card cigar-kpi');
      card.append(element('h3',label),element('strong',value),element('p',note));
      if(index === 4 && stock.length){
        const details = element('details');
        details.append(element('summary','View SKUs'));
        const list = element('ul');
        stock.sort((a,b) => a[1]-b[1] || a[0].localeCompare(b[0])).forEach(([sku,quantity]) => {
          const description = products.get(sku)?.description;
          list.append(element('li',sku+(description ? ' · '+description : '')+' · '+formatNumber(quantity)));
        });
        details.append(list);
        card.append(details);
      }
      return card;
    }));
  }

  function renderCalendar(records, month, today){
    const grid = $('cigarLoggedDays');
    const title = dateLabel(month,{month:'long',year:'numeric'});
    $('cigarLoggedMonth').textContent = title;
    const byDate = new Set(records.map(record => record.date));
    const firstWeekday = (new Date(month).getUTCDay()+6)%7;
    const days = [];
    for(let i=0;i<firstWeekday;i++) days.push(element('span'));
    for(let date=month;date.slice(0,7) === month.slice(0,7);date=addDays(date,1)){
      const logged = byDate.has(date);
      const state = logged ? 'logged' : date < today ? 'missing' : date === today ? 'not saved' : 'upcoming';
      const day = element(logged || date <= today ? 'button' : 'span',String(Number(date.slice(-2))),'cigar-calendar-day');
      if(day instanceof HTMLButtonElement){
        day.type = 'button';
        day.addEventListener('click',() => openDay(date,logged ? 'view' : 'edit'));
      }
      day.dataset.state = state;
      day.setAttribute('aria-label',dateLabel(date,{dateStyle:'full'})+', '+state);
      if(date === today) day.setAttribute('aria-current','date');
      days.push(day);
    }
    grid.replaceChildren(...days);
  }

  function historyAction(name,iconName,record,action){
    const button = element('button',undefined,'secondary-button cigar-history-action');
    button.type = 'button';
    button.title = name+' '+record.date;
    button.setAttribute('aria-label',button.title);
    button.append(icon(iconName),element('span',name));
    button.addEventListener('click',() => action(record.date));
    return button;
  }

  function renderHistory(records){
    const table = $('cigarHistoryRows');
    table.replaceChildren();
    $('cigarHistoryTable').hidden = !records.length;
    $('cigarHistoryEmpty').hidden = Boolean(records.length);
    for(const record of [...records].reverse()){
      const row = table.insertRow();
      const {sales,jdaSales,variance,mismatches} = record.figures;
      const date = row.insertCell();
      date.append(historyAction(dateLabel(record.date,{weekday:'short',month:'short',day:'numeric',year:'numeric'}),'Calendar',record,date => openDay(date,'view')));
      const transaction = parseQuantity(record.transaction);
      row.insertCell().textContent = transaction === null ? record.transaction || '—' : formatNumber(transaction);
      row.insertCell().textContent = formatNumber(sales);
      row.insertCell().textContent = formatNumber(jdaSales);
      const difference = row.insertCell();
      const chip = element('span',formatSigned(variance),'cigar-variance-chip');
      if(mismatches){
        chip.classList.add('cigar-figure-alert');
        chip.textContent += ' · '+formatNumber(mismatches)+(mismatches === 1 ? ' SKU' : ' SKUs');
      }
      difference.append(chip);
      const actions = row.insertCell();
      actions.className = 'cigar-history-actions';
      actions.append(historyAction('Edit','Pencil',record,date => openDay(date,'edit')),historyAction('Delete','Trash2',record,deleteDay));
    }
  }

  function labelFor(products,sku){
    const description = products.get(sku)?.description;
    return description ? description+' · '+sku : sku;
  }

  function setSkuChoices(){
    const query = skuSearch.value.trim().toLocaleLowerCase();
    const matching = stockChoices.filter(([,label]) => label.toLocaleLowerCase().includes(query));
    skuSelect.replaceChildren(...matching.map(([sku,label]) => new Option(label,sku)));
    skuSelect.disabled = !matching.length;
    if(!matching.length) skuSelect.append(new Option('No matching SKUs',''));
    if(matching.some(([sku]) => sku === selectedSku)) skuSelect.value = selectedSku;
    else skuSelect.selectedIndex = 0;
  }

  function points(records, getValue, gaps = false){
    const result = [];
    let previous;
    for(const record of records){
      const x = dayNumber(record.date);
      if(gaps && previous !== undefined && x-previous > 1) result.push({x:previous+1,y:null});
      result.push({x,y:getValue(record)});
      previous = x;
    }
    return result;
  }

  function colors(){
    const styles = getComputedStyle(panel);
    const read = name => styles.getPropertyValue(name).trim();
    return {
      text:read('--ui-text'), muted:read('--ui-muted'), grid:read('--ui-border'), paper:read('--ui-surface'),
      accent:read('--cigar-chart-main'), secondary:read('--cigar-chart-secondary'), warning:read('--cigar-warning'),
      positive:read('--cigar-chart-positive'), other:read('--cigar-chart-other')
    };
  }

  function axes(palette,horizontal,yLabel,xLabel){
    const axis = {ticks:{color:palette.muted}, grid:{color:palette.grid}, border:{color:palette.grid}};
    const number = label => ({...axis, title:{display:true,text:label,color:palette.muted}, ticks:{...axis.ticks,callback:formatNumber}});
    if(horizontal) return {x:{...number(xLabel),beginAtZero:true}, y:{...axis,grid:{display:false},ticks:{...axis.ticks,autoSkip:false}}};
    const min = dayNumber(currentRange.from);
    const max = dayNumber(currentRange.to);
    return {
      x:{...axis,type:'linear',offset:false,min:min-.5,max:max+.5,
        title:{display:true,text:'Date',color:palette.muted},
        ticks:{...axis.ticks,maxTicksLimit:7,precision:0,callback:value => Number.isInteger(value) ? dateLabel(fromDay(value)) : ''}},
      y:number(yLabel)
    };
  }

  function emptyChart(id,message){
    charts.get(id)?.destroy();
    charts.delete(id);
    $(id).parentElement.hidden = true;
    $(id+'Empty').textContent = message;
    $(id+'Empty').hidden = false;
  }

  function plot(id, config, options = {}){
    if(!config.data.datasets.some(dataset => dataset.data.some(point => validNumber(typeof point === 'object' && point !== null ? point.y : point)))){
      emptyChart(id,options.empty ?? 'No figures to chart in this date range.');
      return;
    }
    charts.get(id)?.destroy();
    const canvas = $(id);
    canvas.parentElement.hidden = false;
    $(id+'Empty').hidden = true;
    const palette = colors();
    const instance = new window.Chart(canvas,{
      ...config,
      options:{
        responsive:true, maintainAspectRatio:false, animation:false,
        indexAxis:options.horizontal ? 'y' : 'x',
        interaction:{mode:'nearest',axis:options.horizontal ? 'y' : 'x',intersect:false},
        scales:axes(palette,options.horizontal,options.yLabel ?? 'Pieces',options.xLabel ?? 'Pieces sold'),
        plugins:{
          legend:{display:options.legend !== false,labels:{color:palette.text,boxWidth:12,boxHeight:8}},
          tooltip:{
            backgroundColor:palette.paper, titleColor:palette.text, bodyColor:palette.text, borderColor:palette.grid,borderWidth:1,
            callbacks:{
              title:items => options.horizontal ? options.labels[items[0].dataIndex] : dateLabel(fromDay(items[0].parsed.x),{dateStyle:'medium'}),
              label:item => item.dataset.label+': '+(options.horizontal ? formatNumber(item.parsed.x) :
                options.signed ? formatSigned(item.parsed.y) : formatNumber(item.parsed.y)),
              afterLabel:item => options.extraTooltip?.(item) ?? ''
            }
          }
        }
      }
    });
    charts.set(id,instance);
  }

  function renderEnding(){
    if(!window.Chart || !chartData || panel.hidden) return;
    const sku = skuSelect.value;
    const lookup = chartData.records.map(record => ({date:record.date, value:record.items.find(item => item.sku === sku)?.ending ?? null}));
    const palette = colors();
    plot('cigarEndingChart',{type:'line',data:{datasets:[{
      label:'ENDING',data:points(lookup,record => record.value,true),borderColor:palette.accent,backgroundColor:palette.accent,
      pointBackgroundColor:lookupColor,pointRadius:3
    }]}},{legend:false,empty:sku ? 'No ending stock is recorded for this SKU in this range.' : 'No matching SKU has stock history.'});

    function lookupColor(context){
      return context.parsed?.y < 0 ? palette.warning : palette.accent;
    }
  }

  async function renderCharts(visible, products, averages, version){
    const ids = ['cigarSalesChart','cigarVarianceChart','cigarEndingChart','cigarTopChart','cigarCountsChart'];
    if(!visible.length){
      ids.forEach(id => emptyChart(id,'No saved entries in this date range.'));
      return;
    }
    if(!window.Chart) ids.forEach(id => emptyChart(id,'Loading chart…'));
    try{await loadLibrary();}
    catch{
      if(version === renderVersion) ids.forEach(id => emptyChart(id,'The chart could not load. Reopen Trends to try again.'));
      return;
    }
    if(version !== renderVersion || panel.hidden) return;
    const palette = colors();
    const line = (label,values,color,style = {}) => ({
      label,data:values,borderColor:color,backgroundColor:color,borderWidth:2,pointRadius:2, ...style
    });
    plot('cigarSalesChart',{type:'line',data:{datasets:[
      line('SALES',points(visible,record => record.figures.sales,true),palette.accent),
      line('7-day average',points(visible,record => averages.get(record.date),true),palette.secondary,{borderDash:[5,4],pointRadius:0})
    ]}});
    const compared = visible.filter(record => record.figures.variance !== null);
    const mismatchByDay = new Map(compared.map(record => [dayNumber(record.date),record.figures.mismatches]));
    plot('cigarVarianceChart',{type:'bar',data:{datasets:[
      {label:'SALES above JDA_S',data:points(compared.filter(record => record.figures.variance > 0),record => record.figures.variance),backgroundColor:palette.positive,grouped:false,maxBarThickness:16},
      {label:'SALES below JDA_S',data:points(compared.filter(record => record.figures.variance < 0),record => record.figures.variance),backgroundColor:palette.warning,grouped:false,maxBarThickness:16},
      {type:'line',label:'Net zero',data:points(compared.filter(record => record.figures.variance === 0),() => 0),pointRadius:3,showLine:false,
        backgroundColor:palette.muted,pointBackgroundColor:point => mismatchByDay.get(point.parsed?.x) ? palette.warning : palette.muted}
    ]}},{yLabel:'Difference (pcs)',signed:true,extraTooltip:item => {
      const count = mismatchByDay.get(item.parsed.x);
      return count ? formatNumber(count)+(count === 1 ? ' SKU differs' : ' SKUs differ') : '';
    }});
    renderEnding();
    const top = data.topSales(visible);
    const labels = top.map(([sku]) => labelFor(products,sku));
    const brief = (label,index) => {
      const sku = top[index][0];
      return label.length <= 23 ? label : label.slice(0,Math.max(5,19-sku.length))+'… · '+sku;
    };
    plot('cigarTopChart',{type:'bar',data:{labels:labels.map(brief),datasets:[
      {label:'SALES',data:top.map(([,sales]) => sales),backgroundColor:palette.accent,borderRadius:3,maxBarThickness:18}
    ]}},{horizontal:true,legend:false,labels,empty:'No SKUs have positive sales in this date range.'});
    const seriesColors = [palette.accent,palette.secondary,palette.positive,palette.warning,palette.other];
    plot('cigarCountsChart',{type:'line',data:{datasets:Object.entries(data.metadata).map(([key,label],index) =>
      line(label,points(visible,record => parseQuantity(record[key]),true),seriesColors[index]))
    }},{yLabel:'Count',empty:'No numeric daily counts in this date range.'});
  }

  function render(){
    if(panel.hidden) return;
    const version = ++renderVersion;
    const {products,records} = getState();
    const datedRecords = records.filter(record => validDate(record.date));
    const summarized = datedRecords.map(record => ({...record, figures:totals(record.items)}));
    const today = localDate();
    const range = rangeFor(today);
    currentRange = range;
    const productMap = new Map(products.map(product => [product.sku,product]));
    const visible = range ? summarized.filter(record => record.date >= range.from && record.date <= range.to) : [];
    const expected = range ? Math.max(0,dayNumber(range.to < today ? range.to : today)-dayNumber(range.from)+1) : 0;
    const logged = visible.filter(record => record.date <= today).length;
    $('cigarRangeSummary').textContent = range ? dateLabel(range.from,{dateStyle:'medium'})+' – '+dateLabel(range.to,{dateStyle:'medium'})+
      ' · '+formatNumber(logged)+' of '+formatNumber(expected)+' days logged through today' : 'Choose a valid start and end date.';
    $('cigarTrendsEmpty').hidden = Boolean(datedRecords.length);
    $('cigarTrendContent').hidden = !datedRecords.length || !range;
    $('cigarTrendExport').disabled = !datedRecords.length;
    if(!datedRecords.length || !range) return;
    renderKpis(summarized,visible,productMap,today,range.to < today ? range.to : today);
    renderCalendar(summarized,monthStart(range.to),today);
    renderHistory(visible);
    const stockSkus = new Set();
    for(const record of visible){
      for(const item of record.items) if(validNumber(item.ending)) stockSkus.add(item.sku);
    }
    stockChoices = [...stockSkus].map(sku => [sku,labelFor(productMap,sku)]).sort((a,b) => a[1].localeCompare(b[1]));
    setSkuChoices();
    chartData = {records:visible};
    const averageRecords = summarized.filter(record => record.date >= addDays(range.from,-6) && record.date <= range.to);
    const values = data.movingAverage(averageRecords,averageRecords.map(record => record.figures));
    const averages = new Map(averageRecords.map((record,index) => [record.date,values[index]]));
    renderCharts(visible,productMap,averages,version);
  }

  rangeControls.addEventListener('click',event => {
    const button = event.target.closest('button[data-range]');
    if(!button) return;
    if(button.dataset.range === 'custom' && !startDate.value){
      startDate.value = currentRange?.from ?? monthStart(localDate());
      endDate.value = currentRange?.to ?? localDate();
    }
    rangeMode = button.dataset.range;
    for(const option of rangeControls.querySelectorAll('button')) option.setAttribute('aria-pressed',String(option === button));
    $('cigarTrendCustomRange').hidden = rangeMode !== 'custom';
    render();
    if(rangeMode === 'custom') startDate.focus();
  });
  startDate.addEventListener('change',render);
  endDate.addEventListener('change',render);
  skuSearch.addEventListener('input',() => {setSkuChoices();renderEnding();});
  skuSelect.addEventListener('change',() => {selectedSku = skuSelect.value;renderEnding();});
  $('cigarTrendExport').addEventListener('click',() => exportCsv(currentRange));
  new MutationObserver(() => {if(!panel.hidden) render();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-accent','style']});

  return {render};
};
