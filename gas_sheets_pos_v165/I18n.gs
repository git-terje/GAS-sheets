/***** I18n.gs — v2.0.0 *****/

/**
 * Load i18n map from project files (data/i18n.<lang>.json fallback to en).
 * Public: getI18n(lang)
 */
function _loadI18nFrom(path){
  return JSON.parse(HtmlService.createHtmlOutputFromFile(path).getContent());
}
function getI18n(lang){
  lang = String(lang || 'en').toLowerCase();
  var candidates = [
    'data/i18n.' + lang,
    'i18n.' + lang,
    'data/i18n.en',
    'i18n.en'
  ];
  for (var i=0;i<candidates.length;i++){
    try {
      var obj = _loadI18nFrom(candidates[i]);
      if (obj && typeof obj === 'object' && Object.keys(obj).length) return obj;
    } catch(e) {}
  }
  // ultra-safe fallback
  return {
    LOCALE:"en-US", CURRENCY:"USD", BRAND:"POS",
    LOGIN:"Log in", LOGOUT:"Log out",
    ADMIN_LOGIN:"Admin login", ADMIN_ID_PH:"Admin ID",
    DISP_LOGIN:"Dispensary login", DISP_ID_PH:"Dispensary ID",
    PIN_PH:"PIN (4-8 digits)", AUTH_FAILED:"Authentication failed",
    DASHBOARD:"Dashboard", CATALOG:"Catalog", ORDERS:"Orders", STOCK:"Central stock", SALES7:"Sales last 7 days",
    SEARCH:"Search", REFRESH:"Refresh", ALL_STATUSES:"All statuses",
    ORDERS_TITLE:"Orders", DATE:"Date", DISPENSARY:"Dispensary", SKU:"SKU",
    ORDER_ID:"Order ID", PACKS:"Packs", STATUS:"Status", ACTION:"Action",
    DISPENSARIES:"Dispensaries", NEW_DISP:"New dispensary", ID_LABEL:"ID", DISPLAY_NAME:"Display name",
    SHARE_PCT:"Share %", ACTIVE:"Active", INACTIVE:"Inactive", YES:"Yes", NO:"No",
    EDIT:"Edit", RESET_PIN:"Reset PIN", SAVE:"Save", CANCEL:"Cancel",
    CART:"Cart", SUBMIT_ORDER:"Submit order", YOUR_ORDERS:"Your orders", CONTENT:"Content",
    CENTRAL_STOCK:"Central stock", BUY_PRICE:"Dispensary price", MARKET_PRICE:"Market price",
    PACK:"pack", ADD_TO_ORDER:"Add to order", NO_PRODUCTS:"No products available.", NO_LINES:"No lines",
    STATUS_LABELS:{ "Received":"Received", "Confirmed":"Confirmed", "Delivered":"Delivered", "Rejected":"Rejected" }
  };
}
