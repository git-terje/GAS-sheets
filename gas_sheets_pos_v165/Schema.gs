/** Schema.gs | GAS sheets POS — spreadsheet resolver (robust) */
/** Finn gyldig Spreadsheet i alle kjørekontekster. */
function _resolveSpreadsheet(){
  var id = (typeof CONFIG!=='undefined' && CONFIG.SPREADSHEET_ID && String(CONFIG.SPREADSHEET_ID).trim()) || '';
  if (id) {
    try { return SpreadsheetApp.openById(id); }
    catch(e){
      // Fallback: via Drive (krever drive.readonly)
      try {
        var f = DriveApp.getFileById(id);
        var ss = SpreadsheetApp.open(f);
        if (ss) return ss;
      } catch(e2){}
    }
  }
  var url = (typeof CONFIG!=='undefined' && CONFIG.SPREADSHEET_URL && String(CONFIG.SPREADSHEET_URL).trim()) || '';
  if (url) {
    try {
      var byUrl = SpreadsheetApp.openByUrl(url);
      if (byUrl) return byUrl;
    } catch(e){}
  }
  // Container-bound fallback
  try {
    var active = SpreadsheetApp.getActive() || SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch(e){}

  throw new Error('Spreadsheet not found. Set CONFIG.SPREADSHEET_ID or bind the script.');
}


/** Ensure a sheet exists and has at least the given headers on row 1 */
function _ensureSheet(ss, name, headers){
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const must = headers || [];
  const lc = sh.getLastColumn();
  const cur = lc ? sh.getRange(1,1,1,lc).getValues()[0].map(String) : [];
  if (cur.length === 0 && must.length) {
    sh.getRange(1,1,1,must.length).setValues([must]);
    return sh;
  }
  if (must.length && String(cur) !== String(must)) {
    const add = must.filter(h => cur.indexOf(h) < 0);
    if (add.length) {
      sh.insertColumnsAfter(cur.length || 1, add.length);
      sh.getRange(1, (cur.length || 0) + 1, 1, add.length).setValues([add]);
    }
  }
  return sh;
}

/** Assert all required sheets and headers */
function assertSchema(){
  const ss = _resolveSpreadsheet();

  // Headers compiled from log (v1.3.0 map), kept to the sheets defined in Constants v0.7.0.
  _ensureSheet(ss, 'Users',           ['UID','DisplayName','Role','PinHash','PinSalt','DispensaryLocalID','Active']);
  _ensureSheet(ss, 'Strains',         ['StrainID','Name','Category','Genetics','THC','CBD','ContentUnit','DispensaryPrice','MarketPrice','Active','CreatedISO']);
  _ensureSheet(ss, 'Batches',         ['BatchID','StartYYMM','StartDateISO','EndDateISO','Notes','Active']);
  _ensureSheet(ss, 'Plants',          ['PlantID','BatchID','StrainID','PlantNo','CreatedISO','Active']);
  _ensureSheet(ss, 'PlantStatus',     ['RowID','PlantID','BatchID','StrainID','StatusID','WeightG','DateISO','Note','Active']);
  _ensureSheet(ss, 'StatusCatalog',   ['StatusID','Name','Active']);
  _ensureSheet(ss, 'Packages',        ['SKU','ProductNr','PackageType','SizeCode','ContentQty','ContentUnit','Price','Active']);
  _ensureSheet(ss, 'CentralStock',    ['SKU','PackageCount']);
  _ensureSheet(ss, 'DispensaryStock', ['DispensaryID','SKU','PackageCount','UpdatedISO']);
  _ensureSheet(ss, 'Orders',          ['OrderID','DispensaryID','SKU','Qty','Status','CreatedISO','UpdatedISO','ReceivedISO']);
  _ensureSheet(ss, 'Sales',           ['SaleID','DispensaryID','UID','CustomerUID','ItemsJSON','Total','CreatedISO']); // added vs v0.9.5
  _ensureSheet(ss, 'Logs',            ['Timestamp','CorrId','Level','Version','Panel','UID','Action','Details','Meta']);

  return { ok: true };
}
