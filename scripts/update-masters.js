const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'data', 'seed', 'howrah.json');
const dbPath = path.join(__dirname, '..', 'data', 'db.json');

const rawSeed = fs.readFileSync(seedPath, 'utf8');
const d = JSON.parse(rawSeed);

console.log('--- Updating Master Data ---');

// 1. Update Material UOMs
// Casseroles & Lids -> EA, Soyabean Oil -> L
const eaMaterials = [
  'CASSEROLL 210 ML 50 MICRON',
  'CASSEROLL 120 ML 50 MICRON',
  'CASSEROLL 120ML 32 MICRON',
  'LID 210ML PRNT 300 GSM (120 MM X 90 MM )',
  'LID 120ML 350 GSM (82 MM X 91 MM)',
  'LID 120 ML PRINT VB (75 MM X 75 MM)',
  'LID 210 ML PRINT VB (120 MM X 90 MM)',
  'LID PARATHA 10 MICRON',
  'LID 2 CP PLASTIC THALI 11 GM'
];

d.materials.forEach(m => {
  if (eaMaterials.some(name => m.name.toUpperCase().includes(name.toUpperCase()))) {
    m.unit = 'EA';
  }
  if (m.name.toUpperCase().includes('SOYABEAN OIL')) {
    m.unit = 'L';
  }
});

// Update rates or recipe lines to match material units
const matMap = Object.fromEntries(d.materials.map(m => [m.code, m]));

d.recipes.forEach(r => {
  if (r.componentType === 'MATERIAL') {
    const mat = matMap[r.componentCode];
    if (mat) {
      r.unit = mat.unit;
    }
  }
});

// 2. Ensure Prep Items are SFGs
// All individual breakfast & meal prep components should be typed as 'SFG'
const sfgItemList = [
  { code: 'SFG-BF01', name: 'Aloo Bhaji(VB) 60GM', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF02', name: 'Poori (VB)100GM', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF03', name: 'Boiled Egg (2 no )', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF05', name: 'Omlet(VB) 100GM', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF06', name: 'Paneer Cutlet(VB) 80GM', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF08', name: 'Veg Cutlet(VB) 100GM', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF09', name: 'Ajwain paratha(VB) 100GM', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF10', name: 'Poha (100 gms )', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF11', name: 'VEG UPMA(VB) 150/120 GM', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF12', name: 'Aloo Paratha 150GM (1st AC & EC )', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF13', name: 'DIABETIC BESAN CHILLA(150GM)', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF14', name: 'Paneer Cutlet 100GM', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF15', name: 'Veg Upma(VB) 100GM', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-BF16', name: 'Boiled Veg (50 gms)', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-CS01', name: 'Cheese sandwich 60gms  (1st AC & EC)', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-VS01', name: 'Veg Sandwich (60gms)', group: 'Breakfast', unit: 'portion' },
  { code: 'SFG-KC01', name: 'KACHORI(VB)60GM', group: 'Breakfast', unit: 'portion' }
];

// Add/update these SFG items in items master
sfgItemList.forEach(sfg => {
  const existing = d.items.find(i => i.name.toLowerCase() === sfg.name.toLowerCase() || i.code === sfg.code);
  if (existing) {
    existing.type = 'SFG';
    existing.code = sfg.code;
  } else {
    d.items.push({
      code: sfg.code,
      name: sfg.name,
      type: 'SFG',
      group: sfg.group,
      unit: sfg.unit,
      active: true
    });
  }
});

// Update material recipes parentCode references if code was changed
sfgItemList.forEach(sfg => {
  const oldCodeMatches = ['FG001','FG002','FG003','FG005','FG006','FG008','FG009','FG010','FG011','FG012','FG013','FG014','FG015','FG016'];
  d.recipes.forEach(r => {
    const item = d.items.find(i => i.name.toLowerCase() === sfg.name.toLowerCase());
    if (item && r.parentCode && r.parentCode.startsWith('FG')) {
      const parentItem = d.items.find(i => i.code === r.parentCode);
      if (parentItem && parentItem.name.toLowerCase() === sfg.name.toLowerCase()) {
        r.parentCode = sfg.code;
      }
    }
  });
});

// 3. Define 13 Breakfast FG Combination Items
const breakfastCombos = [
  {
    code: 'FG-BF01',
    name: 'Breakfast 1 (Aloo Paratha + Paneer Cutlet)',
    sfgs: ['SFG-BF12', 'SFG-BF14'] // Aloo Paratha + Paneer Cutlet
  },
  {
    code: 'FG-BF02',
    name: 'Breakfast 2 (Paneer Cutlet + Poha)',
    sfgs: ['SFG-BF14', 'SFG-BF10'] // Paneer Cutlet + Poha
  },
  {
    code: 'FG-BF03',
    name: 'Breakfast 3 (Boiled Veg + Omlette)',
    sfgs: ['SFG-BF16', 'SFG-BF05'] // Boiled Veg + Omlet
  },
  {
    code: 'FG-BF04',
    name: 'Breakfast 4 (Cheese Sandwich + Paneer Cutlet)',
    sfgs: ['SFG-CS01', 'SFG-BF14'] // Cheese Sandwich + Paneer Cutlet
  },
  {
    code: 'FG-BF05',
    name: 'Breakfast 5 (Paneer Cutlet + Veg Sandwich)',
    sfgs: ['SFG-BF14', 'SFG-VS01'] // Paneer Cutlet + Veg Sandwich
  },
  {
    code: 'FG-BF06',
    name: 'Breakfast 6 (Cheese Sandwich + Veg Cutlet)',
    sfgs: ['SFG-CS01', 'SFG-BF08'] // Cheese Sandwich + Veg Cutlet
  },
  {
    code: 'FG-BF07',
    name: 'Breakfast 7 (Veg Cutlet + Veg Sandwich)',
    sfgs: ['SFG-BF08', 'SFG-VS01'] // Veg Cutlet + Veg Sandwich
  },
  {
    code: 'FG-BF08',
    name: 'Breakfast 8 (Kachori + Veg Cutlet)',
    sfgs: ['SFG-KC01', 'SFG-BF08'] // Kachori + Veg Cutlet
  },
  {
    code: 'FG-BF09',
    name: 'Breakfast 9 (Boiled Veg + Veg Cutlet)',
    sfgs: ['SFG-BF16', 'SFG-BF08'] // Boiled Veg + Veg Cutlet
  },
  {
    code: 'FG-BF10',
    name: 'Breakfast 10 (Ajwain Paratha + Aloo Bhaji + Veg Cutlet)',
    sfgs: ['SFG-BF09', 'SFG-BF01', 'SFG-BF08'] // Ajwain Paratha + Aloo Bhaji + Veg Cutlet
  },
  {
    code: 'FG-BF11',
    name: 'Breakfast 11 (Paneer Cutlet + Veg Upma)',
    sfgs: ['SFG-BF14', 'SFG-BF11'] // Paneer Cutlet + Veg Upma
  },
  {
    code: 'FG-BF12',
    name: 'Breakfast 12 (Omlette + Veg Cutlet)',
    sfgs: ['SFG-BF05', 'SFG-BF08'] // Omlet + Veg Cutlet
  },
  {
    code: 'FG-BF13',
    name: 'Breakfast 13 (Aloo Paratha + Veg Cutlet)',
    sfgs: ['SFG-BF12', 'SFG-BF08'] // Aloo Paratha + Veg Cutlet
  }
];

// Add/update Breakfast Combo FGs in items master
breakfastCombos.forEach(cb => {
  const existing = d.items.find(i => i.code === cb.code || i.name.toLowerCase() === cb.name.toLowerCase());
  if (existing) {
    existing.code = cb.code;
    existing.name = cb.name;
    existing.type = 'FG';
    existing.group = 'Breakfast';
    existing.unit = 'portion';
    existing.active = true;
  } else {
    d.items.push({
      code: cb.code,
      name: cb.name,
      type: 'FG',
      group: 'Breakfast',
      unit: 'portion',
      active: true
    });
  }

  // Remove old FG->SFG recipes for this combo parent
  d.recipes = d.recipes.filter(r => !(r.parentCode === cb.code && r.componentType === 'SFG'));

  // Add updated FG -> SFG BOM recipe rows
  cb.sfgs.forEach(sfgCode => {
    const sfgItem = d.items.find(i => i.code === sfgCode);
    if (sfgItem) {
      d.recipes.push({
        id: `bom-${cb.code}-${sfgCode}`,
        parentCode: cb.code,
        componentType: 'SFG',
        componentCode: sfgCode,
        basisQty: 1,
        qty: 1,
        unit: 'portion',
        effectiveFrom: '2026-09-01',
        effectiveTo: '',
        kitchenId: ''
      });
    }
  });
});

console.log('--- Summary of Master Updates ---');
console.log('Total Items:', d.items.length);
console.log('SFG Items:', d.items.filter(i => i.type === 'SFG').length);
console.log('FG Items:', d.items.filter(i => i.type === 'FG').length);
console.log('FG->SFG Recipes:', d.recipes.filter(r => r.componentType === 'SFG').length);

fs.writeFileSync(seedPath, JSON.stringify(d, null, 1));
console.log('Updated seed data at howrah.json successfully!');

if (fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify(d, null, 1));
  console.log('Updated active database at db.json successfully!');
}
