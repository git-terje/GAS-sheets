/** Code.gs | GAS sheets POS — core + users/disp + sizes/packaging + stock + PO + orders + POS | v0.15.0 | 2025-10-27
 * Nytt: Orders (disp→central), POS sale, REQUIRED helper.
 */

function include(name){ return HtmlService.createHtmlOutputFromFile(name).getContent(); }

/*** HTTP ***/
function doGet(e){
  var p=(e&&e.parameter)||{};
  var file=String(p.panel||'').trim()||'Shell';
  var t=HtmlService.createTemplateFromFile(file);
  t.EXEC_URL = getExecUrl();
  t.UID  = String(p.uid||'');
  t.ROLE = String(p.role||'');
  var out;
  try{ out=t.evaluate(); }
  catch(err){
    logError('doGet_render_fail',{file:file,err:String(err)});
    var t2=HtmlService.createTemplateFromFile('Shell'); t2.EXEC_URL=getExecUrl(); out=t2.evaluate();
  }
  return out.setTitle('POS'+(file&&file!=='Shell'?' · '+file:''))
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
            .addMetaTag('viewport','width=device-width, initial-scale=1');
}

/*** Spreadsheet utils ***/
function _ss(){ return _resolveSpreadsheet(); }
function _sh(name){ return _ss().getSheetByName(name); }
function _ensureSheet(ss,name){ var s=ss.getSheetByName(name); return s||ss.insertSheet(name); }
function _shE(name){ return _ensureSheet(_ss(), name); }
function _shKey(key){ return _shE(_sheetNameFor(key)); }
function _headers(sh){ const lc=sh.getLastColumn(); return lc? sh.getRange(1,1,1,lc).getValues()[0].map(String):[]; }
function _buildColMap(h){ const m={}; for (var i=0;i<h.length;i++) m[h[i]]=i; return m; }
function _upsertRows(sh,keyCols,objRows){
  const lr=sh.getLastRow(), lc=sh.getLastColumn(); var values, headers;
  if(lr===0){ if(!objRows.length) return; headers=Object.keys(objRows[0]); sh.getRange(1,1,1,headers.length).setValues([headers]); values=[]; }
  else { const rng=sh.getRange(1,1,lr,lc); values=rng.getValues(); headers=values[0].map(String); }
  const cm=_buildColMap(headers);
  objRows.forEach(o=>{
    Object.keys(o).forEach(k=>{
      if(cm[k]==null){ headers.push(k); cm[k]=headers.length-1; values.forEach((row,i)=>{ if(i>0) row.push(''); }); }
    });
  });
  const data=values.slice(1), head=headers;
  const mapKey=row=>keyCols.map(k=>String(row[cm[k]])).join('|');
  const idx=new Map(); for (var i=0;i<data.length;i++) idx.set(mapKey(data[i]), i);
  objRows.forEach(o=>{
    const key=keyCols.map(k=>String(o[k]||'')).join('|'); let row;
    if(idx.has(key)) row=data[idx.get(key)]; else { row=Array(head.length).fill(''); idx.set(key, data.push(row)-1); }
    Object.keys(o).forEach(k=>{ row[cm[k]]=o[k]; });
  });
  const out=[head].concat(data); sh.clearContents(); sh.getRange(1,1,out.length,out[0].length).setValues(out);
}
function _table(name){
  const sh=_sh(name); if(!sh) throw new Error('Sheet mangler: '+name);
  const lr=sh.getLastRow(); if(lr<2) return {h:_headers(sh),cm:_buildColMap(_headers(sh)),rows:[]};
  const h=_headers(sh), cm=_buildColMap(h); const rows=sh.getRange(2,1,lr-1,h.length).getValues();
  return {h:h, cm:cm, rows:rows};
}
function REQUIRED(v, name){ if(v===undefined||v===null||String(v)==='') throw new Error('Missing '+name); return v; }

/*** Session + logging ***/
var SESSION=(typeof SESSION!=='undefined')?SESSION:{USER:'POS_USER',PANELS:'POS_PANELS',DISP:'POS_DISP'};
function nowISO(){ return new Date().toISOString(); }
function corrId(){ const d=new Date(); const y=String(d.getUTCFullYear()).slice(-2), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); const rnd=Utilities.getUuid().replace(/-/g,'').slice(0,6); return y+m+day+rnd; }
function _ensureLogSheet(){ const ss=_ss(); let sh=ss.getSheetByName(CONFIG.LOG_SHEET); if(!sh) sh=ss.insertSheet(CONFIG.LOG_SHEET); if(sh.getLastRow()===0){ sh.getRange(1,1,1,9).setValues([['Timestamp','CorrId','Level','Version','Panel','UID','Action','Details','Meta']]); } return sh; }
function _log(level,action,details,meta){
  try{
    const sh=_ensureLogSheet();
    const row=[ nowISO(), (meta&&meta.corrId)||corrId(), level, CONFIG.VERSION||'', meta&&meta.panel||'', meta&&meta.uid||'', action||'', typeof details==='string'?details:JSON.stringify(details||''), meta?JSON.stringify(meta):'' ];
    sh.appendRow(row);
  }catch(_){}
}
function logInfo(a,d,m){_log('INFO',a,d,m);} function logWarn(a,d,m){_log('WARN',a,d,m);} function logError(a,d,m){_log('ERROR',a,d,m);}

/*** Exec URL ***/
function getExecUrl(){ try{ var u=ScriptApp.getService().getUrl(); if(u) return u; }catch(_){ } try{ if(typeof CONFIG!=='undefined'&&CONFIG.EXEC_URL) return CONFIG.EXEC_URL; }catch(_){ } return ''; }

/*** Auth + users ***/
function _normalizeCode(pin){ return String(pin||'').toUpperCase().replace(/\s+/g,''); }
function _assertCode(pin){ const p=_normalizeCode(pin); if(!/^[A-Za-z0-9]{3,16}$/.test(p)) throw new Error('Kodeord må være 3–16 tegn [A–Z0–9]'); return p; }
function _hashCode(pin){ const norm=_normalizeCode(pin); const salt=Utilities.getUuid().slice(0,16); const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, norm+salt); const hash=Utilities.base64Encode(bytes); return {hash,salt}; }
function _verifyCode(pin,hash,salt){ const norm=_normalizeCode(pin); const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, norm+salt); return Utilities.base64Encode(bytes)===hash; }
function _isActive(v){ const s=String(v).trim().toLowerCase(); return v===1||v===true||s==='1'||s==='true'||s==='yes'||s==='y'; }
function _canonicalRole(role, uid){ const raw=String(role||'').trim(); if (String(uid).toLowerCase()==='admin') return 'admin'; const r=raw.toLowerCase(); if (r==='admin'||r==='disp'||r==='staff'||r==='customer') return r; return 'staff'; }
function _panelsForRole(role){ switch(String(role||'').toLowerCase()){ case 'admin': return ['Adminpanel','Dispensarypanel','POSpanel']; case 'disp': return ['Dispensarypanel','POSpanel']; case 'staff': return ['POSpanel']; case 'customer': return ['POSpanel']; default: return ['POSpanel']; } }

function adminCreateUser(p){
  const uid=REQUIRED(p.uid,'uid'); const name=String(p.name||'');
  const role=_canonicalRole(p.role, uid);
  const active=_isActive(p.active)!==false?'1':'0';
  let hash=String(p.hash||''), salt=String(p.salt||'');
  if (p.pin){ const h=_hashCode(_assertCode(p.pin)); hash=h.hash; salt=h.salt; }
  if(!hash||!salt) throw new Error('uid and pin required');
  _upsertRows(_shKey('Users'), ['UID'], [{ UID:uid, DisplayName:name, Role:String(role), PinHash:hash, PinSalt:salt, DispensaryLocalID:String(p.dispId||''), Active:active }]);
  logInfo('admin_create_user',{uid:uid,role:role});
  return true;
}
function adminListUsers(){
  const tb=_table(SHEETS.Users), cm=tb.cm;
  return tb.rows.map(r=>({uid:String(r[cm.UID]), name:String(r[cm.DisplayName]||''), role:String(r[cm.Role]||''), dispId:String(r[cm.DispensaryLocalID]||''), active:_isActive(r[cm.Active])}));
}
function adminResetUserPin(uid,newPin){
  const tb=_table(SHEETS.Users), cm=tb.cm; const row=tb.rows.find(r=>String(r[cm.UID])===String(uid)); if(!row) throw new Error('UID ikke funnet');
  const h=_hashCode(_assertCode(newPin)); _upsertRows(_shKey('Users'),['UID'],[{UID:String(uid),PinHash:h.hash,PinSalt:h.salt}]); logInfo('admin_reset_pin',{uid:uid}); return true;
}
function adminSetUserRole(uid, role){
  const r=_canonicalRole(role, uid); _upsertRows(_shKey('Users'),['UID'],[{UID:String(uid),Role:String(r)}]); logInfo('admin_set_role',{uid:uid,role:r}); return true;
}
function adminSetUserActive(uid, active){
  _upsertRows(_shKey('Users'),['UID'],[{UID:String(uid),Active:_isActive(active)?'1':'0'}]); logInfo('admin_set_active',{uid:uid,active:!!_isActive(active)}); return true;
}

/*** Dispensaries ***/
function adminUpsertDispensary(p){
  const id = REQUIRED(p.DispensaryID,'DispensaryID');
  const row = { DispensaryID:id, Name:String(p.Name||''), Active:_isActive(p.Active)!==false?'1':'0', CreatedISO:nowISO() };
  _upsertRows(_shKey('Dispensaries'), ['DispensaryID'], [row]);
  logInfo('disp_upsert',{id:id});
  return true;
}
function adminListDispensaries(){
  const tb=_table(SHEETS.Dispensaries), cm=tb.cm;
  return tb.rows.map(r=>({DispensaryID:String(r[cm.DispensaryID]), Name:String(r[cm.Name]||''), Active:_isActive(r[cm.Active]), CreatedISO:String(r[cm.CreatedISO]||'')}));
}
function adminAssignUserToDisp(uid, dispId){
  _upsertRows(_shKey('Users'), ['UID'], [{ UID:String(uid), DispensaryLocalID:String(dispId||'') }]);
  logInfo('disp_assign_user',{uid:uid,dispId:dispId});
  return true;
}
function dispCreateStaff(dispId, p){
  const uid=REQUIRED(p.uid,'uid');
  const name=String(p.name||'');
  const active=_isActive(p.active)!==false?'1':'0';
  const pin=REQUIRED(p.pin,'pin');
  const h=_hashCode(_assertCode(pin));
  _upsertRows(_shKey('Users'), ['UID'], [{ UID:uid, DisplayName:name, Role:'staff', PinHash:h.hash, PinSalt:h.salt, DispensaryLocalID:String(dispId||''), Active:active }]);
  logInfo('disp_create_staff',{dispId:dispId,uid:uid});
  return true;
}

/*** Word-of-the-day ***/
var CANNABIS_WORDS=(typeof CATALOGS!=='undefined' && CATALOGS.WORDS && CATALOGS.WORDS.length)? CATALOGS.WORDS :
 ['INDICA','SATIVA','HYBRID','TERPENE','TRICHOME','RESIN','KIEF','HASH','ROSIN','TINCTURE','EDIBLE','VAPORIZER','FLOWER','BUD','CULTIVAR','PHENOTYPE','CHEMOTYPE','KUSH','HAZE','SKUNK','MYRCENE','PINENE','LIMONENE','LINALOOL','CARYOPHYLLENE','HUMULENE','OCIMENE'];
function _pickFromListByHash(list, seed){ var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed); var n=((bytes[0]&255)<<24)|((bytes[1]&255)<<16)|((bytes[2]&255)<<8)|(bytes[3]&255); if(n<0) n=(n>>>0); return list[n%list.length]; }
function _yyyymmdd(d){ const dt=d?new Date(d):new Date(); const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,'0'); const day=String(dt.getDate()).padStart(2,'0'); return ''+y+m+day; }
function _dailySecret(){ try{ var sid=ScriptApp.getScriptId()||''; var spid=(typeof CONFIG!=='undefined'&&CONFIG.SPREADSHEET_ID)?CONFIG.SPREADSHEET_ID:''; return sid+':'+spid; }catch(_){ return Utilities.getUuid(); } }
function _wordOfDayPlain(d){ var day=_yyyymmdd(d||new Date()); return _pickFromListByHash(CANNABIS_WORDS, _dailySecret()+':'+day); }
function _ensureDailyHashRow(d){ const day=_yyyymmdd(d||new Date()); const word=_wordOfDayPlain(d); const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, word+':'+day+':'+_dailySecret()); const hash=Utilities.base64Encode(bytes); _upsertRows(_shKey('SecurityDaily'),['DateYYYYMMDD'],[{DateYYYYMMDD:day,WordHash:hash,CreatedISO:nowISO(),Active:'1'}]); return {day,word,hash}; }
function svcGetWordOfToday(role){ const rec=_ensureDailyHashRow(new Date()); const r=String(role||'').toLowerCase(); return {day:rec.day,word:(r==='admin'||r==='disp')?rec.word:null}; }
function svcVerifyDailyWord(input){ const day=_yyyymmdd(new Date()); const w=String(input||'').toUpperCase().replace(/\s+/g,''); if(!/^[A-Z]+$/.test(w)) return {ok:false}; const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, w+':'+day+':'+_dailySecret()); const hash=Utilities.base64Encode(bytes); const tb=_table(SHEETS.SecurityDaily), cm=tb.cm; const row=tb.rows.find(r=>String(r[cm.DateYYYYMMDD])===day); const stored=row?String(row[cm.WordHash]||''):''; const ok=stored?(stored===hash):(w===_wordOfDayPlain(new Date())); logInfo('daily_word_verify',{ok:ok}); return {ok:ok}; }

/*** IDs ***/
function _fmtYYMM(d){ const dt=d?new Date(d):new Date(); const yy=String(dt.getFullYear()).slice(-2); const mm=String(dt.getMonth()+1).padStart(2,'0'); return yy+mm; }
function makeBatchID(dateISO){ return 'B'+_fmtYYMM(dateISO); }
function makePlantID(batchId,plantNo){ const p=String(plantNo).padStart(2,'0'); return String(batchId)+p; }
function computeProductNr(batchId,plantId,statusId){ return String(batchId)+'+'+String(plantId)+'+'+String(statusId); }

/*** Strains/Batches/Plants ***/
function adminUpsertStrain(p){ const row={ StrainID:REQUIRED(p.StrainID,'StrainID'), Name:String(p.Name||''), Category:String(p.Category||''), Genetics:String(p.Genetics||''), THC:String(p.THC||''), CBD:String(p.CBD||''), ContentUnit:(p.ContentUnit||'g'), DispensaryPrice:Number(p.DispensaryPrice)||0, MarketPrice:Number(p.MarketPrice)||0, Active:_isActive(p.Active)!==false?'1':'0', CreatedISO:nowISO() }; _upsertRows(_shKey('Strains'),['StrainID'],[row]); return true; }
function adminDeactivateStrain(id){ _upsertRows(_shKey('Strains'),['StrainID'],[{StrainID:String(id),Active:'0'}]); return true; }
function adminListStrains(){ const tb=_table(SHEETS.Strains), cm=tb.cm; return tb.rows.map(r=>({ StrainID:String(r[cm.StrainID]), Name:String(r[cm.Name]||''), Category:String(r[cm.Category]||''), Genetics:String(r[cm.Genetics]||''), THC:String(r[cm.THC]||''), CBD:String(r[cm.CBD]||''), ContentUnit:String(r[cm.ContentUnit]||'g'), DispensaryPrice:Number(r[cm.DispensaryPrice]||0), MarketPrice:Number(r[cm.MarketPrice]||0), Active:_isActive(r[cm.Active]), CreatedISO:String(r[cm.CreatedISO]||'') })); }

function adminUpsertBatch(p){ const row={ BatchID:REQUIRED(p.BatchID,'BatchID'), StartYYMM:String(p.StartYYMM||_fmtYYMM(new Date())), StartDateISO:String(p.StartDateISO||nowISO()), EndDateISO:String(p.EndDateISO||''), Notes:String(p.Notes||''), Active:_isActive(p.Active)!==false?'1':'0' }; _upsertRows(_shKey('Batches'),['BatchID'],[row]); return true; }
function adminDeactivateBatch(id){ _upsertRows(_shKey('Batches'),['BatchID'],[{BatchID:String(id),Active:'0'}]); return true; }
function adminListBatches(){ const tb=_table(SHEETS.Batches), cm=tb.cm; return tb.rows.map(r=>({ BatchID:String(r[cm.BatchID]), StartYYMM:String(r[cm.StartYYMM]||''), StartDateISO:String(r[cm.StartDateISO]||''), EndDateISO:String(r[cm.EndDateISO]||''), Notes:String(r[cm.Notes]||''), Active:_isActive(r[cm.Active]) })); }

function adminUpsertPlant(p){ const row={ PlantID:REQUIRED(p.PlantID,'PlantID'), BatchID:REQUIRED(p.BatchID,'BatchID'), StrainID:REQUIRED(p.StrainID,'StrainID'), PlantNo:String(p.PlantNo||''), CreatedISO:String(p.CreatedISO||nowISO()), Active:_isActive(p.Active)!==false?'1':'0' }; _upsertRows(_shKey('Plants'),['PlantID'],[row]); return true; }
function adminDeactivatePlant(id){ _upsertRows(_shKey('Plants'),['PlantID'],[{PlantID:String(id),Active:'0'}]); return true; }
function adminListPlants(){ const tb=_table(SHEETS.Plants), cm=tb.cm; return tb.rows.map(r=>({ PlantID:String(r[cm.PlantID]), BatchID:String(r[cm.BatchID]), StrainID:String(r[cm.StrainID]), PlantNo:String(r[cm.PlantNo]||''), CreatedISO:String(r[cm.CreatedISO]||''), Active:_isActive(r[cm.Active]) })); }

/*** Size/Packaging/Stock ***/
function _inchToMM(x){ return Math.round(Number(x||0)*25.4); }
function _mmToIn(x){ return Math.round((Number(x||0)/25.4)*10)/10; }
function adminUpsertSize(p){ const sizeCode=REQUIRED(p.SizeCode,'SizeCode'); let wmm=Number(p.WidthMM||0), hmm=Number(p.HeightMM||0); if((!wmm||!hmm)&&(p.WidthIn||p.HeightIn)){ wmm=_inchToMM(p.WidthIn); hmm=_inchToMM(p.HeightIn); } const win=p.WidthIn?Number(p.WidthIn):_mmToIn(wmm); const hin=p.HeightIn?Number(p.HeightIn):_mmToIn(hmm); const row={ SizeCode:sizeCode, Label:String(p.Label||''), WidthMM:wmm, HeightMM:hmm, WidthIn:win, HeightIn:hin, GuideGrams:Number(p.GuideGrams)||0, MaxGrams:Number(p.MaxGrams)||0, Active:_isActive(p.Active)!==false?'1':'0', Notes:String(p.Notes||'') }; _upsertRows(_shKey('SizeCatalog'),['SizeCode'],[row]); return true; }
function adminListSizes(){ const sh=_sh(SHEETS.SizeCatalog); if(!sh) return []; const lr=sh.getLastRow(); if(lr<2) return []; const h=_headers(sh), cm=_buildColMap(h); const rows=sh.getRange(2,1,lr-1,h.length).getValues(); return rows.map(r=>({ SizeCode:String(r[cm.SizeCode]), Label:String(r[cm.Label]||''), WidthMM:Number(r[cm.WidthMM]||0), HeightMM:Number(r[cm.HeightMM]||0), WidthIn:Number(r[cm.WidthIn]||0), HeightIn:Number(r[cm.HeightIn]||0), GuideGrams:Number(r[cm.GuideGrams]||0), MaxGrams:Number(r[cm.MaxGrams]||0), Active:_isActive(r[cm.Active]), Notes:String(r[cm.Notes]||'') })); }
function adminSeedSizes(){ _shKey('SizeCatalog'); const seeds=(CATALOGS&&CATALOGS.SIZE_SEEDS)?CATALOGS.SIZE_SEEDS:[]; const seen=new Set(); seeds.forEach(s=>{ const w=s.WidthMM||_inchToMM(s.WidthIn); const h=s.HeightMM||_inchToMM(s.HeightIn); const key=(w)+'x'+(h); if(seen.has(key)) return; seen.add(key); adminUpsertSize(s); }); return {ok:true,added:seen.size}; }

function adminUpsertPackagingSize(p){ const row={ PackageType:REQUIRED(p.PackageType,'PackageType'), SizeCode:REQUIRED(p.SizeCode,'SizeCode'), Label:String(p.Label||''), GuideGrams:Number(p.GuideGrams)||0, Active:_isActive(p.Active)!==false?'1':'0', Notes:String(p.Notes||'') }; _upsertRows(_shKey('PackagingCatalog'), ['PackageType','SizeCode'], [row]); return true; }
function adminDeletePackagingSize(packageType,sizeCode){ _upsertRows(_shKey('PackagingCatalog'), ['PackageType','SizeCode'], [{PackageType:String(packageType), SizeCode:String(sizeCode), Active:'0'}]); return true; }
function adminListPackagingSizes(){ const cat=_table(SHEETS.PackagingCatalog), cm=cat.cm; return cat.rows.map(r=>{ const size=_getSize(String(r[cm.SizeCode]))||{}; const guide=Number(r[cm.GuideGrams]||0)||Number(size.GuideGrams||0); return { PackageType:String(r[cm.PackageType]), SizeCode:String(r[cm.SizeCode]), Label:String(r[cm.Label]||size.Label||''), WidthMM:Number(size.WidthMM||0), HeightMM:Number(size.HeightMM||0), WidthIn:Number(size.WidthIn||0), HeightIn:Number(size.HeightIn||0), MaxGrams:Number(size.MaxGrams||0), GuideGrams:guide, Active:_isActive(r[cm.Active]), Notes:String(r[cm.Notes]||'') }; }); }
function adminSeedBagSizes(){ adminSeedSizes(); const map=(CATALOGS&&CATALOGS.PACKAGE_MAP)?CATALOGS.PACKAGE_MAP:{}; Object.keys(map).forEach(pkg=>{ map[pkg].forEach(sizeCode=>{ adminUpsertPackagingSize({PackageType:pkg,SizeCode:sizeCode,Active:'1'}); }); }); return {ok:true}; }

function _getSize(sizeCode){ const sh=_sh(SHEETS.SizeCatalog); if(!sh) return null; const lr=sh.getLastRow(); if(lr<2) return null; const h=_headers(sh), cm=_buildColMap(h); const rows=sh.getRange(2,1,lr-1,h.length).getValues(); const r=rows.find(x=>String(x[cm.SizeCode])===String(sizeCode)); if(!r) return null; return { SizeCode:String(r[cm.SizeCode]), Label:String(r[cm.Label]||''), WidthMM:Number(r[cm.WidthMM]||0), HeightMM:Number(r[cm.HeightMM]||0), WidthIn:Number(r[cm.WidthIn]||0), HeightIn:Number(r[cm.HeightIn]||0), MaxGrams:Number(r[cm.MaxGrams]||0), GuideGrams:Number(r[cm.GuideGrams]||0), Active:_isActive(r[cm.Active]) }; }
function _getPackagingGuide(packageType,sizeCode){ const tb=_table(SHEETS.PackagingCatalog), cm=tb.cm; const r=tb.rows.find(r=>String(r[cm.PackageType])===String(packageType)&&String(r[cm.SizeCode])===String(sizeCode)); if(!r) return null; const size=_getSize(String(r[cm.SizeCode]))||{}; const guide=Number(r[cm.GuideGrams]||0)||Number(size.GuideGrams||0); return { PackageType:String(r[cm.PackageType]), SizeCode:String(r[cm.SizeCode]), Label:String(r[cm.Label]||size.Label||''), WidthMM:Number(size.WidthMM||0), HeightMM:Number(size.HeightMM||0), WidthIn:Number(size.WidthIn||0), HeightIn:Number(size.HeightIn||0), MaxGrams:Number(size.MaxGrams||0), GuideGrams:guide }; }

/*** Inventory sheets ***/
function _getPackStock(packageType,sizeCode){ const tb=_table(SHEETS.PackagingStock), cm=tb.cm; const r=tb.rows.find(r=>String(r[cm.PackageType])===String(packageType)&&String(r[cm.SizeCode])===String(sizeCode)); return r?Number(r[cm.CountAvailable]||0):0; }
function _setPackStock(packageType,sizeCode,count){ _upsertRows(_shKey('PackagingStock'),['PackageType','SizeCode'],[{PackageType:String(packageType),SizeCode:String(sizeCode),CountAvailable:Math.max(0,Number(count)||0),UpdatedISO:nowISO()}]); }
function adminUpsertPackagingStock(p){ _setPackStock(REQUIRED(p.PackageType,'PackageType'),REQUIRED(p.SizeCode,'SizeCode'),REQUIRED(p.CountAvailable,'CountAvailable')); return true; }
function adminAdjustPackagingStock(packageType,sizeCode,delta){ const cur=_getPackStock(packageType,sizeCode); _setPackStock(packageType,sizeCode,cur+Number(delta||0)); return true; }
function adminListPackagingStock(){ const tb=_table(SHEETS.PackagingStock), cm=tb.cm; return tb.rows.map(r=>({ PackageType:String(r[cm.PackageType]), SizeCode:String(r[cm.SizeCode]), CountAvailable:Number(r[cm.CountAvailable]||0), UpdatedISO:String(r[cm.UpdatedISO]||'' ) })); }

function _centralGetCount(sku){ const tb=_table(SHEETS.CentralStock), cm=tb.cm; const r=tb.rows.find(r=>String(r[cm.SKU])===String(sku)); return r?Number(r[cm.PackageCount]||0):0; }
function _centralSetCount(sku,count){ _upsertRows(_shKey('CentralStock'),['SKU'],[{SKU:String(sku),PackageCount:Math.max(0,Number(count)||0)}]); }
function _centralAdjust(sku,delta){ const cur=_centralGetCount(sku); _centralSetCount(sku,cur+Number(delta||0)); }

function _parseSKU(sku){ const parts=String(sku||'').split('|'); return {ProductNr:parts[0]||'', PackageType:parts[1]||'', SizeCode:parts[2]||''}; }
function svcResolveDispId(uid,role){ const r=String(role||'').toLowerCase(); const u=String(uid||''); if(r==='admin') return {dispId:'DP_MAIN'}; const tb=_table(SHEETS.Users), cm=tb.cm; const row=tb.rows.find(x=>String(x[cm.UID])===u); const id=row?String(row[cm.DispensaryLocalID]||''):''; return {dispId: id || ('DP_'+u.toUpperCase())}; }
function dispListCentral(){ const tb=_table(SHEETS.CentralStock), cm=tb.cm; return tb.rows.map(r=>{ const sku=String(r[cm.SKU]); const cnt=Number(r[cm.PackageCount]||0); const p=_parseSKU(sku); const g=_getPackagingGuide(p.PackageType,p.SizeCode)||{}; return {SKU:sku,PackageType:p.PackageType,SizeCode:p.SizeCode,Label:g.Label||'',GuideGrams:g.GuideGrams||0,MaxGrams:g.MaxGrams||0,Count:cnt}; }).filter(x=>x.Count>0); }
function _dispGetCount(dispId,sku){ const tb=_table(SHEETS.DispensaryStock), cm=tb.cm; const r=tb.rows.find(r=>String(r[cm.DispensaryID])===String(dispId)&&String(r[cm.SKU])===String(sku)); return r?Number(r[cm.PackageCount]||0):0; }
function _dispSetCount(dispId,sku,count){ _upsertRows(_shKey('DispensaryStock'),['DispensaryID','SKU'],[{DispensaryID:String(dispId),SKU:String(sku),PackageCount:Math.max(0,Number(count)||0),UpdatedISO:nowISO()}]); }
function _dispAdjust(dispId,sku,delta){ const cur=_dispGetCount(dispId,sku); _dispSetCount(dispId,sku,cur+Number(delta||0)); }
function dispListLocal(dispId){ const tb=_table(SHEETS.DispensaryStock), cm=tb.cm; return tb.rows.filter(r=>String(r[cm.DispensaryID])===String(dispId)).map(r=>{ const sku=String(r[cm.SKU]); const cnt=Number(r[cm.PackageCount]||0); const p=_parseSKU(sku); const g=_getPackagingGuide(p.PackageType,p.SizeCode)||{}; return {SKU:sku,Label:g.Label||'',SizeCode:p.SizeCode,Count:cnt}; }); }

/*** Packaging → SKU + pack product ***/
function statusInventory(opts){ const batchId=opts&&opts.batchId||null, plantId=opts&&opts.plantId||null, statusId=opts&&opts.statusId||null; const gramsTotal=_sumPlantStatusGrams({batchId:batchId,plantId:plantId,statusId:statusId}); const productNr=(batchId&&plantId&&statusId)?computeProductNr(batchId,plantId,statusId):null; const gramsPacked=productNr?_sumPackagesGramsByProductNr(productNr):0; const gramsFree=Math.max(0,gramsTotal-gramsPacked); return {gramsTotal,gramsPacked,gramsFree,productNr}; }
function _sumPlantStatusGrams(filter){ const sh=_sh(SHEETS.PlantStatus); const lr=sh.getLastRow(); if(lr<2) return 0; const h=_headers(sh), cm=_buildColMap(h); const data=sh.getRange(2,1,lr-1,h.length).getValues(); let rows=data.filter(r=>_isActive(r[cm.Active])); if(filter.batchId) rows=rows.filter(r=>String(r[cm.BatchID])===String(filter.batchId)); if(filter.plantId) rows=rows.filter(r=>String(r[cm.PlantID])===String(filter.plantId)); if(filter.statusId) rows=rows.filter(r=>String(r[cm.StatusID])===String(filter.statusId)); return rows.reduce((a,r)=>a+(Number(r[cm.WeightG])||0),0); }
function _sumPackagesGramsByProductNr(productNr){ const sh=_sh(SHEETS.Packages); const lr=sh.getLastRow(); if(lr<2) return 0; const h=_headers(sh), cm=_buildColMap(h); const data=sh.getRange(2,1,lr-1,h.length).getValues(); const rows=data.filter(r=>_isActive(r[cm.Active])&&String(r[cm.ProductNr])===String(productNr)&&String(r[cm.ContentUnit]||'g')==='g'); return rows.reduce((a,r)=>a+(Number(r[cm.ContentQty])||0),0); }
function adminPackProduct(p){ const batchId=REQUIRED(p.BatchID,'BatchID'); const plantId=REQUIRED(p.PlantID,'PlantID'); const statusId=REQUIRED(p.StatusID,'StatusID'); const productNr=computeProductNr(batchId,plantId,statusId); const packageType=REQUIRED(p.PackageType,'PackageType'); const sizeCode=REQUIRED(p.SizeCode,'SizeCode'); const count=Number(REQUIRED(p.Count,'Count')||0); if(count<=0) throw new Error('Count>0'); const guide=_getPackagingGuide(packageType,sizeCode); if(!guide) throw new Error('Ukjent pose'); if(guide.MaxGrams && guide.GuideGrams && guide.GuideGrams > guide.MaxGrams) throw new Error('GuideGrams overstiger MaxGrams'); const inv=statusInventory({batchId:batchId,plantId:plantId,statusId:statusId}); const gramsNeeded=(guide.GuideGrams||0)*count; if(inv.gramsFree<gramsNeeded) throw new Error('Ikke nok gram fra status'); const stock=_getPackStock(packageType,sizeCode); if(stock<count) throw new Error('Ikke nok poser på lager'); const sku=productNr+'|'+packageType+'|'+sizeCode; _centralAdjust(sku,count); _upsertRows(_shKey('Packages'),['SKU'],[{SKU:sku,ProductNr:productNr,PackageType:packageType,SizeCode:sizeCode,ContentQty:Number(guide.GuideGrams||0),ContentUnit:'g',Price:0,Active:'1'}]); _setPackStock(packageType,sizeCode,stock-count); logInfo('admin_pack',{sku:sku,count:count,gramsNeeded:gramsNeeded}); return {ok:true,sku:sku,centralCount:_centralGetCount(sku)}; }

/*** Products (katalog) ***/
function adminUpsertProduct(p){
  const code = REQUIRED(p.ProductCode,'ProductCode');
  const row = { ProductCode:code, Label:String(p.Label||''), StatusID:String(p.StatusID||''), PackageType:REQUIRED(p.PackageType,'PackageType'), SizeCode:REQUIRED(p.SizeCode,'SizeCode'), Price:Number(p.Price)||0, Active:_isActive(p.Active)!==false?'1':'0', Notes:String(p.Notes||''), CreatedISO: nowISO() };
  _upsertRows(_shKey('Products'), ['ProductCode'], [row]); logInfo('product_upsert',{code:code}); return true;
}
function adminListProducts(){ const tb=_table(SHEETS.Products), cm=tb.cm; return tb.rows.map(r=>({ ProductCode:String(r[cm.ProductCode]), Label:String(r[cm.Label]||''), StatusID:String(r[cm.StatusID]||''), PackageType:String(r[cm.PackageType]||''), SizeCode:String(r[cm.SizeCode]||''), Price:Number(r[cm.Price]||0), Active:_isActive(r[cm.Active]), Notes:String(r[cm.Notes]||''), CreatedISO:String(r[cm.CreatedISO]||'') })); }
function adminDeactivateProduct(code){ _upsertRows(_shKey('Products'), ['ProductCode'], [{ProductCode:String(code), Active:'0'}]); logInfo('product_deactivate',{code:code}); return true; }

/*** Orders (disp → central) ***/
function _ordersSheet(){ return _shE('Orders'); }
function dispRequestSKU(dispId, uid, sku, qty, note){
  const q = Number(REQUIRED(qty,'qty')||0); if(q<=0) throw new Error('qty<=0');
  const row = { OrderID:'INV-'+Utilities.getUuid().slice(0,8), DispensaryID:String(dispId||''), SKU:String(sku), Qty:q, Status:'REQUESTED', Note:String(note||''), RequestedByUID:String(uid||''), RequestedByRole:'disp', ApprovedBy:'', ApprovedISO:'', CreatedISO:nowISO(), UpdatedISO:nowISO() };
  _upsertRows(_ordersSheet(), ['OrderID'], [row]); logInfo('inv_request',{dispId:dispId,sku:sku,qty:q});
  return {ok:true, orderId:row.OrderID};
}
function adminListOrders(status, dispId){
  const tb=_table('Orders'), cm=tb.cm;
  let rows=tb.rows.map(r=>({ OrderID:String(r[cm.OrderID]), DispensaryID:String(r[cm.DispensaryID]||''), SKU:String(r[cm.SKU]||''), Qty:Number(r[cm.Qty]||0), Status:String(r[cm.Status]||''), Note:String(r[cm.Note]||''), RequestedByUID:String(r[cm.RequestedByUID]||''), RequestedByRole:String(r[cm.RequestedByRole]||''), ApprovedBy:String(r[cm.ApprovedBy]||''), ApprovedISO:String(r[cm.ApprovedISO]||''), CreatedISO:String(r[cm.CreatedISO]||''), UpdatedISO:String(r[cm.UpdatedISO]||'') }));
  if(status) rows=rows.filter(x=>String(x.Status)===String(status));
  if(dispId) rows=rows.filter(x=>String(x.DispensaryID)===String(dispId));
  return rows;
}
function adminApproveOrder(orderId, approverUid){
  _upsertRows(_ordersSheet(), ['OrderID'], [{ OrderID:String(orderId), Status:'APPROVED', ApprovedBy:String(approverUid||'admin'), ApprovedISO:nowISO(), UpdatedISO:nowISO() }]);
  logInfo('inv_approve',{orderId:orderId});
  return {ok:true};
}
function adminFulfillOrder(orderId, qtyFulfill){
  const tb=_table('Orders'), cm=tb.cm;
  const r = tb.rows.find(x=>String(x[cm.OrderID])===String(orderId)); if(!r) throw new Error('Order not found');
  const status=String(r[cm.Status]||''); if(status!=='APPROVED' && status!=='REQUESTED') throw new Error('Status must be APPROVED/REQUESTED');
  const dispId=String(r[cm.DispensaryID]||''); const sku=String(r[cm.SKU]||''); const req=Number(r[cm.Qty]||0);
  const qty = Number(qtyFulfill||req||0); if(qty<=0) throw new Error('qty<=0');
  const central=_centralGetCount(sku); if(central<qty) throw new Error('Ikke nok på sentrallager');
  _centralAdjust(sku, -qty); _dispAdjust(dispId, sku, qty);
  _upsertRows(_ordersSheet(), ['OrderID'], [{ OrderID:String(orderId), Status:'FULFILLED', UpdatedISO:nowISO() }]);
  logInfo('inv_fulfill',{orderId:orderId, qty:qty});
  return {ok:true};
}

/*** POS ***/
function _priceBySKU(sku){
  const p = _parseSKU(String(sku||'')); const code = (p.PackageType && p.SizeCode) ? (p.PackageType+'-'+p.SizeCode) : '';
  if(code){ try{ const tb=_table(SHEETS.Products), cm=tb.cm; const row=tb.rows.find(r=>String(r[cm.ProductCode])===code && _isActive(r[cm.Active])); if(row) return Number(row[cm.Price]||0); }catch(_){ } }
  const tb=_table(SHEETS.Packages), cm=tb.cm; const r=tb.rows.find(x=>String(x[cm.SKU])===String(sku)); return r? Number(r[cm.Price]||0) : 0;
}
function posListProducts(dispId){
  const local = dispListLocal(dispId);
  return local.map(x=>({ SKU:x.SKU, Label:x.Label, SizeCode:x.SizeCode, Count:x.Count, Price:_priceBySKU(x.SKU) }));
}
function posCreateSale(dispId, uid, items, customerUID){
  const list = (items||[]).map(it=>({sku:String(it.sku), qty:Number(it.qty||0), price:Number(it.price||0)})).filter(it=>it.qty>0);
  if(list.length===0) throw new Error('tom handlekurv');
  // valider lager
  list.forEach(it=>{ const have=_dispGetCount(dispId, it.sku); if(have<it.qty) throw new Error('mangler lager for '+it.sku); });
  // trekk lager
  list.forEach(it=>{ _dispAdjust(dispId, it.sku, -it.qty); });
  const total = list.reduce((a,it)=>a+(it.price*it.qty),0);
  const saleId = 'S-'+Utilities.getUuid().slice(0,8);
  _upsertRows(_shKey('Sales'), ['SaleID'], [{ SaleID:saleId, DispensaryID:String(dispId||''), UID:String(uid||''), CustomerUID:String(customerUID||'WalkIn'), ItemsJSON:JSON.stringify(list), Total:Number(total||0), CreatedISO:nowISO() }]);
  logInfo('pos_sale',{saleId:saleId, dispId:dispId, total:total, items:list.length});
  return {ok:true, saleId:saleId, total:total};
}

/*** Packaging PO (uendret) ***/
function _poSheet(){ return _shE('PackagingPO'); }
function _poRowToObj(cm, r){ return { POID:String(r[cm.POID]), DispID:String(r[cm.DispID]||''), PackageType:String(r[cm.PackageType]||''), SizeCode:String(r[cm.SizeCode]||''), Qty:Number(r[cm.Qty]||0), Status:String(r[cm.Status]||''), RequestedByUID:String(r[cm.RequestedByUID]||''), RequestedByRole:String(r[cm.RequestedByRole]||''), ApprovedByUID:String(r[cm.ApprovedByUID]||''), Note:String(r[cm.Note]||''), CreatedISO:String(r[cm.CreatedISO]||''), UpdatedISO:String(r[cm.UpdatedISO]||'') }; }
function adminCreatePackagingPO(p){ const row={ POID:'PO-'+Utilities.getUuid().slice(0,8), DispID:String(p.DispID||''), PackageType:REQUIRED(p.PackageType,'PackageType'), SizeCode:REQUIRED(p.SizeCode,'SizeCode'), Qty:Number(REQUIRED(p.Qty,'Qty')||0), Status:'REQUESTED', RequestedByUID:String(p.uid||'admin'), RequestedByRole:String(p.role||'admin'), ApprovedByUID:'', Note:String(p.Note||''), CreatedISO:nowISO(), UpdatedISO:nowISO() }; _upsertRows(_poSheet(), ['POID'], [row]); logInfo('packpo_create', {poid:row.POID, pkg:row.PackageType, size:row.SizeCode, qty:row.Qty}); return {ok:true, poid:row.POID}; }
function adminListPackagingPO(status, dispId){ const tb=_table('PackagingPO'), cm=tb.cm; let rows=tb.rows.map(r=>_poRowToObj(cm,r)); if(status) rows=rows.filter(x=>String(x.Status)===String(status)); if(dispId) rows=rows.filter(x=>String(x.DispID)===String(dispId)); return rows; }
function adminApprovePackagingPO(poid, approverUid){ const tb=_table('PackagingPO'), cm=tb.cm; const r=tb.rows.find(x=>String(x[cm.POID])===String(poid)); if(!r) throw new Error('PO not found'); if(String(r[cm.Status])!=='REQUESTED') throw new Error('Status must be REQUESTED'); _upsertRows(_poSheet(), ['POID'], [{ POID:String(poid), Status:'APPROVED', ApprovedByUID:String(approverUid||'admin'), UpdatedISO:nowISO() }]); logInfo('packpo_approved',{poid:poid}); return {ok:true}; }
function adminRejectPackagingPO(poid, approverUid, note){ const tb=_table('PackagingPO'), cm=tb.cm; const r=tb.rows.find(x=>String(x[cm.POID])===String(poid)); if(!r) throw new Error('PO not found'); if(String(r[cm.Status])!=='REQUESTED') throw new Error('Status must be REQUESTED'); _upsertRows(_poSheet(), ['POID'], [{ POID:String(poid), Status:'REJECTED', ApprovedByUID:String(approverUid||'admin'), Note:String(note||''), UpdatedISO:nowISO() }]); logInfo('packpo_rejected',{poid:poid}); return {ok:true}; }
function adminMarkPackagingPOOrdered(poid){ const tb=_table('PackagingPO'), cm=tb.cm; const r=tb.rows.find(x=>String(x[cm.POID])===String(poid)); if(!r) throw new Error('PO not found'); const allowed = ['APPROVED','REQUESTED']; if(allowed.indexOf(String(r[cm.Status]))<0) throw new Error('Status must be APPROVED/REQUESTED'); _upsertRows(_poSheet(), ['POID'], [{ POID:String(poid), Status:'ORDERED', UpdatedISO:nowISO() }]); logInfo('packpo_ordered',{poid:poid}); return {ok:true}; }
function adminMarkPackagingPOReceived(poid, qtyReceived){ const tb=_table('PackagingPO'), cm=tb.cm; const r=tb.rows.find(x=>String(x[cm.POID])===String(poid)); if(!r) throw new Error('PO not found'); const pkg=String(r[cm.PackageType]), size=String(r[cm.SizeCode]); const qty = Number(qtyReceived||r[cm.Qty]||0); if(qty<=0) throw new Error('qty<=0'); adminAdjustPackagingStock(pkg, size, qty); _upsertRows(_poSheet(), ['POID'], [{ POID:String(poid), Status:'RECEIVED', UpdatedISO:nowISO() }]); logInfo('packpo_received',{poid:poid, qty:qty}); return {ok:true}; }
function dispCreatePackagingPO(dispId, uid, packageType, sizeCode, qty, note){ return adminCreatePackagingPO({ DispID:dispId, uid:uid, role:'disp', PackageType:packageType, SizeCode:sizeCode, Qty:qty, Note:note }); }
function dispListPackagingPO(dispId, status){ return adminListPackagingPO(status, dispId); }

/*** Login ***/
function ping(){ return 'pong'; }
function svcPing(){ return ping(); }
function doLogin(uid, pin) {
  const cid = corrId ? corrId() : Utilities.getUuid().slice(0,8);
  const tb = _table(SHEETS.Users), cm = tb.cm;
  if (tb.rows.length === 0) { logWarn('login_no_users', {}, {corrId: cid}); return { ok:false, reason:'no_users' }; }
  const row = tb.rows.find(r => String(r[cm.UID]) === String(uid));
  if (!row) { logWarn('login_no_uid', {uid}, {corrId: cid}); return { ok:false, reason:'no_uid' }; }
  if (!_isActive(row[cm.Active])) { logWarn('login_inactive', {uid}, {corrId: cid}); return { ok:false, reason:'inactive' }; }
  const ok = _verifyCode(String(pin), String(row[cm.PinHash]||''), String(row[cm.PinSalt]||''));
  if (!ok) { logWarn('login_bad_pin', {uid}, {corrId: cid}); return { ok:false, reason:'bad_pin' }; }
  const role = _canonicalRole(String(row[cm.Role]||''), uid);
  const panels = _panelsForRole(role);
  const next = panels[0] || 'Shell';
  logInfo('login_user_ok', { uid:String(uid), role:role, next:next, panels:panels }, { corrId: cid });
  return { ok:true, uid:String(uid), role:role, dispId:String(row[cm.DispensaryLocalID]||''), panels:panels, next:next };
}
function svcLogin(uid, pin) { return doLogin(uid, pin); }
