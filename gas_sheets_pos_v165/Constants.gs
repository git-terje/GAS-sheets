/** Constants.gs — GAS sheets POS | v0.7.0 — canonical names, enums, REQUIRED helper
 * Source: log snapshot 2025-10-24.
 */

/* REQUIRED: safe required-value helper */
if (typeof REQUIRED === 'undefined') {
  function REQUIRED(v, label){
    if (v === undefined || v === null || v === '') throw new Error((label || 'value') + ' required');
    return v;
  }
}

/* Units and enums */
const UNITS = Object.freeze(['g','stk','kr']);

const PACKAGING_TYPES = Object.freeze({
  BLACKBAG: 'BLACKBAG',
  CURING_BLACK: 'CURING_BLACK',
  CURING_PRO: 'CURING_PRO'
});

const STATUSES = Object.freeze({
  DRY:     { id: '10', name: 'DRY' },
  EXTRACT: { id: '20', name: 'EXTRACT' },
  OIL:     { id: '30', name: 'OIL' },
  EDIBLE:  { id: '40', name: 'EDIBLE' }
});

/* Sheet name map (canonical) */
const SHEETS = Object.freeze({
  Users:           'Users',
  Strains:         'Strains',
  Batches:         'Batches',
  Plants:          'Plants',
  PlantStatus:     'PlantStatus',
  StatusCatalog:   'StatusCatalog',
  Packages:        'Packages',
  CentralStock:    'CentralStock',
  DispensaryStock: 'DispensaryStock',
  Orders:          'Orders',
  Sales:           'Sales',
  Logs:            'Logs'
});
/**

var HEADERS = (typeof HEADERS !== 'undefined') ? HEADERS : {
  Users:            ['UID','DisplayName','Role','PinHash','PinSalt','DispensaryLocalID','Active'],
  Dispensaries:     ['DispensaryID','Name','Active','CreatedISO'],
  Strains:          ['StrainID','Name','Category','Genetics','THC','CBD','ContentUnit','DispensaryPrice','MarketPrice','Active','CreatedISO'],
  Batches:          ['BatchID','StartYYMM','StartDateISO','EndDateISO','Notes','Active'],
  Plants:           ['PlantID','BatchID','StrainID','PlantNo','CreatedISO','Active'],
  PlantStatus:      ['BatchID','PlantID','StatusID','WeightG','Active','CreatedISO'],
  Packages:         ['SKU','ProductNr','PackageType','SizeCode','ContentQty','ContentUnit','Price','Active'],
  Products:         ['ProductCode','Label','StatusID','PackageType','SizeCode','Price','Active','Notes','CreatedISO'],
  SizeCatalog:      ['SizeCode','Label','WidthMM','HeightMM','WidthIn','HeightIn','GuideGrams','MaxGrams','Active','Notes'],
  PackagingCatalog: ['PackageType','SizeCode','Label','GuideGrams','Active','Notes'],
  PackagingStock:   ['PackageType','SizeCode','CountAvailable','UpdatedISO'],
  CentralStock:     ['SKU','PackageCount'],
  DispensaryStock:  ['DispensaryID','SKU','PackageCount','UpdatedISO'],
  SecurityDaily:    ['DateYYYYMMDD','WordHash','CreatedISO','Active'],
  PackagingPO:      ['POID','DispID','PackageType','SizeCode','Qty','Status','RequestedByUID','RequestedByRole','ApprovedByUID','Note','CreatedISO','UpdatedISO'],
  Orders:           ['OrderID','DispensaryID','SKU','Qty','Status','Note','RequestedByUID','RequestedByRole','ApprovedBy','ApprovedISO','CreatedISO','UpdatedISO'],
  Sales:            ['SaleID','DispensaryID','UID','CustomerUID','ItemsJSON','Total','CreatedISO'],
  Logs:             ['Timestamp','CorrId','Level','Version','Panel','UID','Action','Details','Meta']
};
 */