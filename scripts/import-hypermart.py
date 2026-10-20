"""Stream only HYPERMART from XLSX. Public output excludes vendor/internal fields.
No price/stock/brand/net-size is inferred. Requires Python standard library only.
"""
import sys, json, gzip, hashlib, collections, re, datetime, zipfile, posixpath
from decimal import Decimal, ROUND_HALF_UP
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

def text(v):
    value = str(v or '').strip()
    return '' if value.upper() in ('NULL', 'NONE', 'N/A') else value

def check_digit(code):
    if len(code) not in (8, 12, 13, 14) or not code.isdigit(): return None
    return sum(int(c) * (3 if i % 2 == 0 else 1) for i, c in enumerate(code[-2::-1])) % 10 == (-int(code[-1])) % 10

def save_gzip(path, data):
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
    packed = gzip.compress(raw, mtime=0)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(packed)
    return {'path':str(path.relative_to(ROOT / 'shopper')).replace('\\','/'), 'bytes':len(packed), 'checksum':hashlib.sha256(packed).hexdigest()}

def assortment_rows(source):
    archive=zipfile.ZipFile(source)
    strings=[]
    if 'xl/sharedStrings.xml' in archive.namelist():
        for _,el in ET.iterparse(archive.open('xl/sharedStrings.xml'),events=('end',)):
            if el.tag==NS+'si':
                strings.append(''.join(e.text or '' for e in el.iter(NS+'t')));el.clear()
    workbook=ET.fromstring(archive.read('xl/workbook.xml'))
    sheet=next(iter(workbook.find(NS+'sheets')))
    rid=sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
    rels=ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
    target=next(r.get('Target') for r in rels if r.get('Id')==rid)
    target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
    result={};rounding=[];duplicates=[]
    for _,el in ET.iterparse(archive.open(target),events=('end',)):
        if el.tag!=NS+'row':continue
        row=['','',''];n=int(el.get('r','0'))
        for c in el:
            address=re.match(r'[A-Z]+',c.get('r','A')).group()
            if address not in ('A','B','C'):continue
            v=c.find(NS+'v');value=v.text if v is not None else ''
            if c.get('t')=='s':value=strings[int(value)] if value else ''
            elif c.get('t')=='inlineStr':value=''.join(t.text or '' for t in c.iter(NS+'t'))
            row[ord(address)-65]=text(value)
        el.clear()
        if n==1:
            if [x.lower() for x in row]!=['sku','description','price']:raise ValueError('Expected Sku, Description, PRICE headers')
            continue
        sku,name,raw=row
        if not sku and not name and not raw:continue
        if sku.endswith('.0') and sku[:-2].isdigit():sku=sku[:-2]
        if not sku or not name:raise ValueError(f'Missing SKU/description at row {n}')
        value=Decimal(raw)
        if not value.is_finite() or value<0:raise ValueError(f'Invalid price at row {n}')
        cents=int((value*100).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
        if abs(value-Decimal(cents)/100)>Decimal('0.00000001'):rounding.append({'row':n,'sku':sku,'sourcePrice':raw,'priceCentavos':cents})
        item={'sku':sku,'description':name,'priceCentavos':cents,'row':n}
        if sku in result:
            if result[sku]['priceCentavos']!=cents:raise ValueError(f'Conflicting duplicate SKU {sku}')
            duplicates.append(sku)
        result[sku]=item
    return result,{'sourceSheet':sheet.get('name'),'sourceRows':len(result)+len(duplicates),'duplicateSku':duplicates,'roundedPrices':rounding}

def run(source, assortment_source=None):
    archive = zipfile.ZipFile(source)
    strings = []
    if 'xl/sharedStrings.xml' in archive.namelist():
        for _, el in ET.iterparse(archive.open('xl/sharedStrings.xml'), events=('end',)):
            if el.tag == NS+'si':
                strings.append(''.join(e.text or '' for e in el.iter(NS+'t')))
                el.clear()
    workbook = ET.fromstring(archive.read('xl/workbook.xml'))
    sheet = next(s for s in workbook.find(NS+'sheets') if s.get('name','').strip().upper() == 'HYPERMART')
    rid = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
    rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
    target = next(r.get('Target') for r in rels if r.get('Id') == rid)
    target = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
    products, codes = {}, collections.defaultdict(set)
    categories, subcategories, departments = [], [], []
    cat_ids, sub_ids, dep_ids = {}, {}, {}
    counts = collections.Counter()
    warnings = []
    def intern(value, names, ids):
        if value not in ids: ids[value] = len(names); names.append(value)
        return ids[value]
    headers = None
    for _, el in ET.iterparse(archive.open(target), events=('end',)):
        if el.tag != NS+'row': continue
        row = [''] * 23
        for c in el:
            address = re.match(r'[A-Z]+',c.get('r','A')).group()
            index = 0
            for char in address: index = index * 26 + ord(char) - 64
            v = c.find(NS+'v')
            value = v.text if v is not None else ''
            if c.get('t') == 's': value = strings[int(value)] if value else ''
            elif c.get('t') == 'inlineStr': value = ''.join(t.text or '' for t in c.iter(NS+'t'))
            if index <= 23: row[index-1] = text(value)
        el.clear()
        if headers is None: headers = row; continue
        sku, name = row[0], row[1]
        if not sku or not name: counts['emptyRows'] += 1; continue
        counts['sourceRows'] += 1
        dep = intern(row[11] or 'Uncategorized', departments, dep_ids)
        cat = intern(row[12] or row[11] or 'Uncategorized', categories, cat_ids)
        sub = intern(row[14] or row[13] or '', subcategories, sub_ids)
        if sku not in products:
            products[sku] = [sku, name, cat, sub, dep, set(), row[10], row[16]]
            counts['status_'+row[10]] += 1
        elif products[sku][1] != name:
            counts['conflictingDescriptions'] += 1
        for code in set(filter(None, (row[8],row[9]))):
            if code.endswith('.0') and code[:-2].isdigit(): code = code[:-2]
            products[sku][5].add(code)
            codes[code].add(sku)
        if counts['sourceRows'] % 100000 == 0: print(f"Read {counts['sourceRows']:,} HYPERMART rows", flush=True)
    master_count=len(products)
    assortment_report=None
    selected=None
    if assortment_source:
        selected,assortment_report=assortment_rows(assortment_source)
        unmatched=[];joined={};name_differences=0
        for sku,item in selected.items():
            if sku in products:
                joined[sku]=products[sku]
                if products[sku][1]!=item['description']:name_differences+=1
            else:
                unmatched.append({'sku':sku,'description':item['description'],'row':item['row']})
                joined[sku]=[sku,item['description'],intern('UNCATEGORIZED',categories,cat_ids),intern('NOT IN MASTER',subcategories,sub_ids),intern('UNMAPPED ITEMS',departments,dep_ids),set(),'','']
        products=joined
        codes=collections.defaultdict(set)
        for sku,p in products.items():
            for code in p[5]:codes[code].add(sku)
        assortment_report.update({'matchedSku':len(selected)-len(unmatched),'unmatchedSku':len(unmatched),'unmatched':unmatched,'masterDescriptionDifferences':name_differences,'priceDateSupplied':False,'roundingPolicy':'Nearest centavo, decimal ROUND_HALF_UP','sourceName':Path(assortment_source).name,'checksum':hashlib.sha256(Path(assortment_source).read_bytes()).hexdigest()})
    version=2 if selected else 1
    output = ROOT / 'shopper' / 'catalog'
    output.mkdir(parents=True, exist_ok=True)
    if output.resolve()!=(ROOT/'shopper'/'catalog').resolve():raise RuntimeError('Unexpected catalog output')
    for old_file in output.glob('*.json.gz'):
        if old_file.name.startswith(('search.v','products.v','barcodes.v','starter.v')):old_file.unlink()
    search = []
    buckets = [[] for _ in range(64)]
    for sku, p in products.items():
        search.append(p[:5])
        p[5] = sorted(p[5])
        bucket = sum(sku.encode()) % 64
        buckets[bucket].append(p)
        if not p[5]: counts['productsWithoutBarcode'] += 1
    barcode_buckets = [{} for _ in range(64)]
    for code, skus in codes.items():
        if len(skus) > 1: counts['ambiguousBarcodes'] += 1
        valid = check_digit(code)
        if valid is False: counts['checkDigitWarnings'] += 1
        if valid is None: counts['internalOrOtherCodes'] += 1
        barcode_buckets[sum(code.encode()) % 64][code] = sorted(skus)
    counts['masterUniqueProducts'] = master_count
    counts['uniqueProducts'] = len(products)
    counts['uniqueBarcodes'] = len(codes)
    counts['repeatedSkuRows'] = counts['sourceRows'] - master_count
    counts['missingPrice'] = 0 if selected else len(products)
    files = [save_gzip(output/f'search.v{version}.{d}.json.gz', [r for r in search if r[4] == d]) for d in range(len(departments))]
    starter, category_counts = [], collections.Counter()
    for row in search:
        if (selected or departments[row[4]] in ('FMCG','FRESH & STAPLE')) and category_counts[row[2]] < 8:
            starter.append(row)
            category_counts[row[2]] += 1
    starter_file = save_gzip(output/f'starter.v{version}.json.gz', starter)
    files.append(starter_file)
    for n, rows in enumerate(buckets): files.append(save_gzip(output/f'products.v{version}.{n}.json.gz',rows))
    for n, index in enumerate(barcode_buckets): files.append(save_gzip(output/f'barcodes.v{version}.{n}.json.gz',index))
    source_hash = hashlib.sha256(Path(source).read_bytes()).hexdigest()
    meta = {'version':version,'schemaVersion':1,'mode':'priced-assortment' if selected else 'reference-only','sourceSheet':'HYPERMART','sourceName':Path(source).name,
      'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'priceAsOf':None,'itemCount':len(products),
      'pricedItemCount':len(selected) if selected else 0,'defaultDepartment':'all' if selected else 'groceries','starterPath':starter_file['path'],'sourceChecksum':source_hash,'checksum':hashlib.sha256(''.join(f['checksum'] for f in files).encode()).hexdigest(),'categories':categories,'subcategories':subcategories,'departments':departments,
      'files':files,'counts':dict(counts),'priceWarning':'Prices may not always be accurate. Estimate only. Final prices are confirmed at the cashier.'}
    if selected:
        meta['assortmentSourceName']=Path(assortment_source).name
        meta['assortmentChecksum']=assortment_report['checksum']
        meta['masterMatchedCount']=assortment_report['matchedSku'];meta['unmappedItemCount']=assortment_report['unmatchedSku']
        price_items=[{'sku':sku,'name':p[1],'category':categories[p[2]],'subcategory':subcategories[p[3]],'department':departments[p[4]],'priceCentavos':selected[sku]['priceCentavos'],'priceAsOf':None,'priceSource':'Supplied price list','masterMatched':p[6]!=''} for sku,p in products.items()]
        prices={'schemaVersion':1,'sourceSheet':'HYPERMART','version':1,'updatedAt':meta['updatedAt'],'effectiveDate':None,'sourceName':Path(assortment_source).name,'items':price_items,'history':[]}
        (output/'catalog-prices.json').write_text(json.dumps(prices,ensure_ascii=False,separators=(',',':')),encoding='utf8')
        starter_skus={row[0] for row in starter[:48]}
        (output/'starter-prices.json').write_text(json.dumps({**prices,'items':[p for p in price_items if p['sku'] in starter_skus]},ensure_ascii=False,separators=(',',':')),encoding='utf8')
        (ROOT/'docs'/'assortment-import-report.json').write_text(json.dumps(assortment_report,ensure_ascii=False,indent=2),encoding='utf8')
    (output/'catalog-meta.json').write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    (ROOT/'docs'/'catalog-import-report.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({'counts':dict(counts),'compressedBytes':sum(f['bytes'] for f in files),'departments':departments,'categories':categories},ensure_ascii=False),flush=True)

if __name__ == '__main__':
    if len(sys.argv)!=3:raise SystemExit('Usage: import-hypermart.py MASTER.xlsx ASSORTMENT-AND-PRICES.xlsx')
    run(sys.argv[1],sys.argv[2])
