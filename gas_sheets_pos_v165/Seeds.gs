/** Seeds.gs — v0.3.0 | standard seeds for SizeCatalog og PackagingCatalog */
function adminSeedSizeCatalog(){
  const rows = [
    // grams-baserte US-bagger
    {SizeCode:'1G',   Label:'One Gram',         WidthMM:76,  HeightMM:102, GuideGrams:1.0,   MaxGrams:1.2, Active:1},
    {SizeCode:'3_5G', Label:'Eighth (3.5g)',    WidthMM:89,  HeightMM:127, GuideGrams:3.5,  MaxGrams:4.0, Active:1},
    {SizeCode:'7G',   Label:'Quarter (7g)',     WidthMM:102, HeightMM:152, GuideGrams:7.0,  MaxGrams:8.0, Active:1},
    {SizeCode:'14G',  Label:'Half Oz (14g)',    WidthMM:127, HeightMM:203, GuideGrams:14.0, MaxGrams:16,  Active:1},
    {SizeCode:'28G',  Label:'Oz (28g)',         WidthMM:152, HeightMM:229, GuideGrams:28.0, MaxGrams:32,  Active:1},
    {SizeCode:'112G', Label:'Quarter Pound',    WidthMM:203, HeightMM:254, GuideGrams:112,  MaxGrams:128, Active:1},
    {SizeCode:'448G', Label:'Pound',            WidthMM:330, HeightMM:381, GuideGrams:448,  MaxGrams:512, Active:1},
    // metriske småposer (yttre mål)
    {SizeCode:'70x100', Label:'7x10 cm',  WidthMM:70,  HeightMM:100, GuideGrams:1.0,  MaxGrams:1.5, Active:1},
    {SizeCode:'80x120', Label:'8x12 cm',  WidthMM:80,  HeightMM:120, GuideGrams:2.0,  MaxGrams:3.0, Active:1},
    {SizeCode:'100x150',Label:'10x15 cm', WidthMM:100, HeightMM:150, GuideGrams:3.5,  MaxGrams:5.0, Active:1},
    {SizeCode:'120x180',Label:'12x18 cm', WidthMM:120, HeightMM:180, GuideGrams:7.0,  MaxGrams:10,  Active:1},
  ];
  const sh=_sh('SizeCatalog'); if(!sh) throw new Error('SizeCatalog missing');
  const head=['SizeCode','Label','WidthMM','HeightMM','GuideGrams','MaxGrams','Active'];
  sh.clear(); sh.getRange(1,1,1,head.length).setValues([head]);
  rows.forEach(r=>_append('SizeCatalog', r));
  return {ok:true,count:rows.length};
}

function adminSeedPackagingCatalog(){
  const rows = [
    {PackageType:'BLACKBAG', SizeCode:'1G',    Label:'Blackbag 1g',    GuideGrams:1.0,  MaxGrams:1.2, Active:1},
    {PackageType:'BLACKBAG', SizeCode:'3_5G',  Label:'Blackbag 3.5g',  GuideGrams:3.5,  MaxGrams:4.0, Active:1},
    {PackageType:'BLACKBAG', SizeCode:'7G',    Label:'Blackbag 7g',    GuideGrams:7.0,  MaxGrams:8.0, Active:1},
    {PackageType:'BLACKBAG', SizeCode:'14G',   Label:'Blackbag 14g',   GuideGrams:14.0, MaxGrams:16,  Active:1},
    {PackageType:'BLACKBAG', SizeCode:'28G',   Label:'Blackbag 28g',   GuideGrams:28.0, MaxGrams:32,  Active:1},
    {PackageType:'BLACKBAG', SizeCode:'70x100',Label:'Blackbag 7x10',  GuideGrams:1.0,  MaxGrams:1.5, Active:1},
    {PackageType:'BLACKBAG', SizeCode:'80x120',Label:'Blackbag 8x12',  GuideGrams:2.0,  MaxGrams:3.0, Active:1},
    {PackageType:'BLACKBAG', SizeCode:'100x150',Label:'Blackbag 10x15',GuideGrams:3.5,  MaxGrams:5.0, Active:1},
    {PackageType:'BLACKBAG', SizeCode:'120x180',Label:'Blackbag 12x18',GuideGrams:7.0,  MaxGrams:10,  Active:1},
  ];
  const sh=_sh('PackagingCatalog'); if(!sh) throw new Error('PackagingCatalog missing');
  const head=['PackageType','SizeCode','Label','GuideGrams','MaxGrams','Active'];
  sh.clear(); sh.getRange(1,1,1,head.length).setValues([head]);
  rows.forEach(r=>_append('PackagingCatalog', r));
  return {ok:true,count:rows.length};
}