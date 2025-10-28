/** GAS sheets POS | Helpers.gs | v0.3.3 | 2025-10-21 | tidsstempel, korrelasjons-ID og logging */
/**
 * nowISO() – ISO8601 i UTC
 * corrId() – kort korrelasjons-ID for å lenke hendelser
 * logInfo/Warn/Error() – skriver strukturert logg til Logs-arket
 */
function nowISO(){ return new Date().toISOString(); }

function corrId(){
  // 12 tegn: YYMMDD + 6 hex
  const d = new Date();
  const y = String(d.getUTCFullYear()).slice(-2);
  const m = String(d.getUTCMonth()+1).padStart(2,'0');
  const day = String(d.getUTCDate()).padStart(2,'0');
  const rnd = Utilities.getUuid().replace(/-/g,'').slice(0,6);
  return y+m+day + rnd;
}

function _ensureLogSheet(){
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sh = ss.getSheetByName(CONFIG.LOG_SHEET);
  if (!sh) sh = ss.insertSheet(CONFIG.LOG_SHEET);
  if (sh.getLastRow() === 0){
    sh.getRange(1,1,1,7).setValues([['Timestamp','CorrId','Level','User','Action','Details','Meta']]);
  }
  return sh;
}

function _log(level, action, details, meta){
  try{
    const sh = _ensureLogSheet();
    const row = [
      nowISO(),
      (meta && meta.corrId) || corrId(),
      level,
      getSessionUser() || getSessionRole() || '',
      action || '',
      typeof details === 'string' ? details : JSON.stringify(details || ''),
      meta ? JSON.stringify(meta) : ''
    ];
    sh.appendRow(row);
  }catch(e){ /* best-effort logging */ }
}

function logInfo(action, details, meta){ _log('INFO', action, details, meta); }
function logWarn(action, details, meta){ _log('WARN', action, details, meta); }
function logError(action, details, meta){ _log('ERROR', action, details, meta); }
