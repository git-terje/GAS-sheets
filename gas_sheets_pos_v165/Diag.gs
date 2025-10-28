/** GAS sheets POS | Diag.gs | v0.5.4 | diagnose login + bootstrap + logg-sjekk */

/**
 * Opprett/valider Logs-ark og skriv en røyklogg.
 * Bruk: kjør først for å sikre at logging fungerer.
 */
function diagEnsureLogs(){
  assertSchema();               // sørger for at ark finnes
  try { _ensureLogSheet(); } catch (_) {}
  logInfo('diag_smoke', { ok:true, ts:new Date().toISOString() }, { panel:'Diag' });
  return 'OK: Logs skrevet. Sjekk "Logs"-arket.';
}

/**
 * Normaliser Users og opprett standardbrukere.
 * - admin: Adminpanel, Dispensarypanel (PIN 1234)
 * - dp01:  Dispensarypanel for DP_001 (PIN 1234)
 * - staff01: Adminpanel (PIN 1234)
 */
function bootstrapAuth(){
  runAssertSchema();
  try { fixUsersActive(); } catch (_){}
  try { dedupeUsersByUID(); } catch (_){}

  adminCreateUser({
    uid:'admin', name:'Admin', pin:'1234',
    dispId:'', panels:['Adminpanel'], active:true
  });
  adminCreateUser({
    uid:'dp01', name:'Dispensary A', pin:'1234',
    dispId:'DP_001', panels:['Dispensarypanel'], active:true
  });
  adminCreateUser({
    uid:'staff01', name:'Staff', pin:'1234',
    dispId:'', panels:['POSpanel'], active:true
  });

  logInfo('bootstrap_auth_done', { users:['admin','dp01','staff01'] });
  return adminListUsers();
}

/**
 * Spor login-beslutningen for en bestemt UID/PIN.
 * Returnerer alt som brukes i valideringen slik at du ser eksakt årsak.
 */
function diagLoginTrace(uid, pin){
  const want = String(uid).trim();
  const rr = _readLogical('Users');

  const found = rr.rows.find(r => String(r.UID).trim() === want) || null;
  const active = found ? (typeof _isActive === 'function' ? _isActive(found.Active) : String(found.Active)==='1') : false;
  const pinOk = found ? _verifyPin(String(pin), String(found.PinHash||''), String(found.PinSalt||'')) : false;
  const panels = found ? String(found.Panels||'').split(/[,;\s]+/).filter(Boolean) : [];
  const dispId = found ? String(found.DispensaryLocalID||'') : '';

  const result = {
    uidInput: want,
    exists: !!found,
    active: active,
    pinOk: pinOk,
    panels: panels,
    dispId: dispId,
    requiresDispForDispPanel: panels.indexOf('Dispensarypanel')>=0 && !dispId,
    decision: (!found || !active || !pinOk || panels.length===0 || (panels.indexOf('Dispensarypanel')>=0 && !dispId)) ? 'Login' : panels[0]
  };
  try { logInfo('diag_login_trace', result); } catch(_){}
  return result;
}
3