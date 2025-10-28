/** Catalogs.gs | static catalogs for sizes, packaging map, and vocabulary | v0.1.0 | 2025-10-26
 * Samler alle statiske verdier slik at Code.gs blir kortere og enklere å vedlikeholde.
 */
var CATALOGS = (typeof CATALOGS !== 'undefined') ? CATALOGS : (function(){
  // Størrelser (kombinerer tomme- og mm-varianter). GuideGrams = anbefalt innhold. MaxGrams = øvre grense.
  const SIZE_SEEDS = [
    // MM-standard
    { SizeCode:'70x100',  Label:'7×10 cm',  WidthMM:70,  HeightMM:100, GuideGrams:1,   MaxGrams:1 },
    { SizeCode:'80x120',  Label:'8×12 cm',  WidthMM:80,  HeightMM:120, GuideGrams:2,   MaxGrams:2 },
    { SizeCode:'100x150', Label:'10×15 cm', WidthMM:100, HeightMM:150, GuideGrams:3.5, MaxGrams:3.5 },
    { SizeCode:'120x180', Label:'12×18 cm', WidthMM:120, HeightMM:180, GuideGrams:7,   MaxGrams:7 },
    // Tommer-standard
    { SizeCode:'1G',   Label:'One Gram (3×4")',     WidthIn:3,   HeightIn:4,  GuideGrams:1,   MaxGrams:1 },
    { SizeCode:'3.5G', Label:'Eighth (3.5×5")',     WidthIn:3.5, HeightIn:5,  GuideGrams:3.5, MaxGrams:3.5 },
    { SizeCode:'7G',   Label:'Quarter (4×6")',      WidthIn:4,   HeightIn:6,  GuideGrams:7,   MaxGrams:7 },
    { SizeCode:'14G',  Label:'Half Oz (5×8")',      WidthIn:5,   HeightIn:8,  GuideGrams:14,  MaxGrams:14 },
    { SizeCode:'28G',  Label:'One Oz (6×9")',       WidthIn:6,   HeightIn:9,  GuideGrams:28,  MaxGrams:28 },
    { SizeCode:'112G', Label:'Quarter Lb (8×10")',  WidthIn:8,   HeightIn:10, GuideGrams:112, MaxGrams:112 },
    { SizeCode:'448G', Label:'One Pound (13×15")',  WidthIn:13,  HeightIn:15, GuideGrams:448, MaxGrams:448 }
  ];

  // Standard packaging per type → hvilke størrelser som er gyldige
  const PACKAGE_MAP = {
    BLACKBAG: ['1G','3.5G','7G','14G','28G','112G','448G','70x100','80x120','100x150','120x180']
  };

  // Ord for “Word of the day”
  const WORDS = [
    'INDICA','SATIVA','HYBRID','TERPENE','TRICHOME','RESIN','KIEF','HASH','ROSIN','TINCTURE',
    'EDIBLE','VAPORIZER','FLOWER','BUD','CULTIVAR','PHENOTYPE','CHEMOTYPE','KUSH','HAZE','SKUNK',
    'MYRCENE','PINENE','LIMONENE','LINALOOL','CARYOPHYLLENE','HUMULENE','OCIMENE'
  ];

  return { SIZE_SEEDS: SIZE_SEEDS, PACKAGE_MAP: PACKAGE_MAP, WORDS: WORDS };
})();
