const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'data', 'seed', 'howrah.json');
const dbPath = path.join(__dirname, '..', 'data', 'db.json');

const rawSeed = fs.readFileSync(seedPath, 'utf8');
const d = JSON.parse(rawSeed);

console.log('--- Cleaning and Re-building Master Data ---');

// 1. Material UOM Corrections
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

const matMap = Object.fromEntries(d.materials.map(m => [m.code, m]));
d.recipes.forEach(r => {
  if (r.componentType === 'MATERIAL') {
    const mat = matMap[r.componentCode];
    if (mat) r.unit = mat.unit;
  }
});

// 2. Define SFG Prep Items with code prefix SFG-
const sfgDefinitions = [
  { code: 'SFG001', name: 'Aloo Bhaji(VB) 60GM' },
  { code: 'SFG002', name: 'Poori (VB)100GM' },
  { code: 'SFG003', name: 'Boiled Egg (2 no )' },
  { code: 'SFG004', name: 'FINGER CHIPS(VB) 50GM' },
  { code: 'SFG005', name: 'Omlet(VB) 100GM' },
  { code: 'SFG006', name: 'Paneer Cutlet(VB) 80GM' },
  { code: 'SFG007', name: 'IDLI VADA' },
  { code: 'SFG008', name: 'Veg Cutlet(VB) 100GM' },
  { code: 'SFG009', name: 'Ajwain paratha(VB) 100GM' },
  { code: 'SFG010', name: 'Poha (100 gms )' },
  { code: 'SFG011', name: 'VEG UPMA(VB) 150/120 GM' },
  { code: 'SFG012', name: 'Aloo Paratha 150GM (1st AC & EC )' },
  { code: 'SFG013', name: 'DIABETIC BESAN CHILLA(150GM)' },
  { code: 'SFG014', name: 'Paneer Cutlet 100GM' },
  { code: 'SFG015', name: 'Veg Upma(VB) 100GM' },
  { code: 'SFG016', name: 'Boiled Veg (50 gms)' },
  { code: 'SFG017', name: 'Cheese sandwich 60gms  (1st AC & EC)' },
  { code: 'SFG018', name: 'Veg Sandwich (60gms)' },
  { code: 'SFG019', name: 'KACHORI(VB)60GM' }
];

// Ensure all SFG prep items exist in d.items with type 'SFG'
sfgDefinitions.forEach(sfg => {
  let item = d.items.find(i => i.code === sfg.code || i.name.trim().toLowerCase() === sfg.name.trim().toLowerCase());
  if (item) {
    item.code = sfg.code;
    item.name = sfg.name;
    item.type = 'SFG';
    item.group = 'Breakfast';
    item.unit = 'portion';
    item.active = true;
  } else {
    d.items.push({
      code: sfg.code,
      name: sfg.name,
      type: 'SFG',
      group: 'Breakfast',
      unit: 'portion',
      active: true
    });
  }
});

// Update MATERIAL recipes so their parentCode points to the SFG code
d.recipes.forEach(r => {
  if (r.componentType === 'MATERIAL') {
    const sfg = sfgDefinitions.find(s => s.name.trim().toLowerCase() === (d.items.find(i => i.code === r.parentCode)?.name || '').trim().toLowerCase());
    if (sfg) {
      r.parentCode = sfg.code;
    }
  }
});

// 3. Define 13 Breakfast Combo FG Items (Breakfast 1 to Breakfast 13)
const breakfastCombos = [
  {
    code: 'FG001',
    name: 'Breakfast 1 (Aloo Paratha + Paneer Cutlet)',
    components: ['SFG012', 'SFG014'] // Aloo Paratha + Paneer Cutlet 100GM
  },
  {
    code: 'FG002',
    name: 'Breakfast 2 (Paneer Cutlet + Poha)',
    components: ['SFG014', 'SFG010'] // Paneer Cutlet 100GM + Poha
  },
  {
    code: 'FG003',
    name: 'Breakfast 3 (Boiled Veg + Omlette)',
    components: ['SFG016', 'SFG005'] // Boiled Veg + Omlet
  },
  {
    code: 'FG004',
    name: 'Breakfast 4 (Cheese Sandwich + Paneer Cutlet)',
    components: ['SFG017', 'SFG014'] // Cheese Sandwich + Paneer Cutlet
  },
  {
    code: 'FG005',
    name: 'Breakfast 5 (Paneer Cutlet + Veg Sandwich)',
    components: ['SFG014', 'SFG018'] // Paneer Cutlet + Veg Sandwich
  },
  {
    code: 'FG006',
    name: 'Breakfast 6 (Cheese Sandwich + Veg Cutlet)',
    components: ['SFG017', 'SFG008'] // Cheese Sandwich + Veg Cutlet
  },
  {
    code: 'FG007',
    name: 'Breakfast 7 (Veg Cutlet + Veg Sandwich)',
    components: ['SFG008', 'SFG018'] // Veg Cutlet + Veg Sandwich
  },
  {
    code: 'FG008',
    name: 'Breakfast 8 (Kachori + Veg Cutlet)',
    components: ['SFG019', 'SFG008'] // Kachori + Veg Cutlet
  },
  {
    code: 'FG009',
    name: 'Breakfast 9 (Boiled Veg + Veg Cutlet)',
    components: ['SFG016', 'SFG008'] // Boiled Veg + Veg Cutlet
  },
  {
    code: 'FG010',
    name: 'Breakfast 10 (Ajwain Paratha + Aloo Bhaji + Veg Cutlet)',
    components: ['SFG009', 'SFG001', 'SFG008'] // Ajwain Paratha + Aloo Bhaji + Veg Cutlet
  },
  {
    code: 'FG011',
    name: 'Breakfast 11 (Paneer Cutlet + Veg Upma)',
    components: ['SFG014', 'SFG011'] // Paneer Cutlet + Veg Upma
  },
  {
    code: 'FG012',
    name: 'Breakfast 12 (Omlette + Veg Cutlet)',
    components: ['SFG005', 'SFG008'] // Omlet + Veg Cutlet
  },
  {
    code: 'FG013',
    name: 'Breakfast 13 (Aloo Paratha + Veg Cutlet)',
    components: ['SFG012', 'SFG008'] // Aloo Paratha + Veg Cutlet
  }
];

// 4. Update d.items with exact Breakfast Combo FGs
breakfastCombos.forEach(cb => {
  let existing = d.items.find(i => i.code === cb.code || i.name.startsWith(cb.name.split(' ')[0] + ' ' + cb.name.split(' ')[1]));
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
});

// Remove all old FG->SFG recipe rows completely to avoid duplicate/stale mappings
d.recipes = d.recipes.filter(r => r.componentType !== 'SFG');

// Add fresh, accurate FG -> SFG recipe rows for all 13 Breakfast combos
breakfastCombos.forEach(cb => {
  cb.components.forEach(sfgCode => {
    const sfg = d.items.find(i => i.code === sfgCode);
    if (sfg) {
      d.recipes.push({
        id: `rec-${cb.code}-${sfgCode}`,
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

// Remove any duplicate or orphaned FG codes (like FG-BF01 created earlier)
const validCodes = new Set([...d.items.map(i => i.code)]);
d.items = d.items.filter((item, index, self) => 
  index === self.findIndex(t => t.code === item.code)
);

console.log('--- Result Summary ---');
console.log('Total Items:', d.items.length);
console.log('FG Items:', d.items.filter(i => i.type === 'FG').length);
console.log('SFG Items:', d.items.filter(i => i.type === 'SFG').length);
console.log('FG->SFG Recipes:', d.recipes.filter(r => r.componentType === 'SFG').length);

// Save to howrah.json seed
fs.writeFileSync(seedPath, JSON.stringify(d, null, 1));
console.log('Updated howrah.json seed file!');

// Save to db.json
fs.writeFileSync(dbPath, JSON.stringify(d, null, 1));
console.log('Updated db.json active database file!');
