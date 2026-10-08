const fs = require('fs');
const path = require('path');

const docPath = 'C:\\Users\\Rishita Chaubey\\.gemini\\antigravity\\brain\\987c9329-481a-4570-8026-eba7fbdc3589\\.system_generated\\steps\\262\\content.md';
const text = fs.readFileSync(docPath, 'utf8');
const lines = text.split(/\r?\n/);

console.log(`Total lines read: ${lines.length}`);

// 1. Extract Materials & Rates
const materialsMap = {}; // matName -> { code, name, uom, rate }

let i = 0;
while (i < lines.length && !lines[i].includes('Parent Item-Description')) {
  i++;
}
if (i < lines.length) i++; // skip header

let matIndex = 1;
while (i < lines.length) {
  const line = lines[i].trim();
  if (line.includes('SFG MASTER') || line.startsWith('Type')) break;

  if (line && !line.startsWith('UOM') && !line.startsWith('Actual rates') && !/^\d[\d\.,]*$/.test(line)) {
    const matName = line;
    let uom = '';
    let rate = null;

    let j = i + 1;
    while (j < lines.length && j < i + 6) {
      const nxt = lines[j].trim();
      if (!nxt) { j++; continue; }

      if (!uom && ['KG', 'L', 'EA', 'GM', 'ML', 'kg', 'l', 'ea', 'gm', 'ml'].includes(nxt)) {
        uom = nxt.toUpperCase();
      } else if (/^[\d,]+\.?\d*$/.test(nxt)) {
        rate = parseFloat(nxt.replace(/,/g, ''));
      }
      if (uom && rate !== null) break;
      j++;
    }

    if (matName && rate !== null) {
      let up = matName.toUpperCase();
      if (up.includes('CASSEROLL') || up.includes('LID')) uom = 'EA';
      else if (up.includes('OIL') || up.includes('FRESH CREAM')) uom = 'L';
      else if (up.includes('EGG') && uom === 'L') uom = 'EA';
      else if (!uom) uom = 'KG';

      const code = `MAT${String(matIndex++).padStart(4, '0')}`;
      materialsMap[matName.toLowerCase()] = { code, name: matName, uom, rate };
      i = j;
    }
  }
  i++;
}

console.log(`Extracted ${Object.keys(materialsMap).length} materials with rates.`);

// 2. Parse SFG Master Recipes (lines ~304 to ~3750)
// Format in text:
// Group (e.g. "Lunch and dinner")
// SFG Name (e.g. "Aloo Methi Dry(50GM)")
// Material Name (e.g. "POTATO (FRESH)")
// Qty (e.g. "10.000")
// UOM (e.g. "KG")
// Portions (e.g. "100")

const sfgItemsMap = {}; // sfgName -> { code, name, group }
const materialRecipes = []; // recipe rows

let currentGroup = 'Lunch and dinner';
let sfgIndex = 1;

while (i < lines.length && !lines[i].includes('Breakfast 1')) {
  const line = lines[i].trim();
  
  if (['Lunch and dinner', 'Breakfast', 'Hi-tea', 'Extra Paratha'].includes(line)) {
    currentGroup = line;
    i++;
    continue;
  }

  if (line && !line.startsWith('Type') && !line.startsWith('menu') && !line.startsWith('Items')) {
    const sfgName = line;
    
    if (i + 4 < lines.length) {
      const compName = lines[i+1].trim();
      const qtyStr = lines[i+2].trim();
      const uomStr = lines[i+3].trim().toUpperCase();
      const portStr = lines[i+4].trim();

      const qty = parseFloat(qtyStr.replace(/,/g, ''));
      const basis = parseFloat(portStr.replace(/,/g, ''));

      if (compName && !isNaN(qty) && !isNaN(basis) && basis > 0) {
        // Valid SFG recipe line
        const sfgKey = sfgName.toLowerCase();
        if (!sfgItemsMap[sfgKey]) {
          const code = `SFG${String(sfgIndex++).padStart(4, '0')}`;
          sfgItemsMap[sfgKey] = { code, name: sfgName, group: currentGroup };
        }

        // Check if component material exists in materialsMap, if not add it
        const compKey = compName.toLowerCase();
        if (!materialsMap[compKey]) {
          let uom = uomStr;
          let up = compName.toUpperCase();
          if (up.includes('CASSEROLL') || up.includes('LID')) uom = 'EA';
          else if (up.includes('OIL') || up.includes('FRESH CREAM')) uom = 'L';
          else if (up.includes('EGG') && uom === 'L') uom = 'EA';

          const code = `MAT${String(matIndex++).padStart(4, '0')}`;
          materialsMap[compKey] = { code, name: compName, uom, rate: 10.0 };
        }

        const mat = materialsMap[compKey];

        materialRecipes.push({
          id: `rec-${sfgItemsMap[sfgKey].code}-${mat.code}`,
          parentCode: sfgItemsMap[sfgKey].code,
          componentType: 'MATERIAL',
          componentCode: mat.code,
          basisQty: basis,
          qty: qty,
          unit: mat.uom,
          effectiveFrom: '2026-09-01',
          effectiveTo: '',
          kitchenId: ''
        });

        i += 5;
        continue;
      }
    }
  }
  i++;
}

console.log(`Extracted ${Object.keys(sfgItemsMap).length} SFG prep items.`);
console.log(`Extracted ${materialRecipes.length} SFG -> Material recipe lines.`);

// 3. Define 13 Breakfast FG Combo Items & FG -> SFG recipes
const breakfastCombos = [
  { code: 'FG001', name: 'Breakfast 1 (Aloo Paratha + Paneer Cutlet)', components: ['Aloo Paratha (Vb)150GM', 'Paneer Cutlet 100GM'] },
  { code: 'FG002', name: 'Breakfast 2 (Paneer Cutlet + Poha)', components: ['Paneer Cutlet 100GM', 'Poha (100 gms )'] },
  { code: 'FG003', name: 'Breakfast 3 (Boiled Veg + Omlette)', components: ['Boiled Veg (50 gms)', 'Omlet(VB) 100GM'] },
  { code: 'FG004', name: 'Breakfast 4 (Cheese Sandwich + Paneer Cutlet)', components: ['Cheese sandwich 60gms  (1st AC&EC)', 'Paneer Cutlet 100GM'] },
  { code: 'FG005', name: 'Breakfast 5 (Paneer Cutlet + Veg Sandwich)', components: ['Paneer Cutlet 100GM', 'Veg Sandwich (60gms)'] },
  { code: 'FG006', name: 'Breakfast 6 (Cheese Sandwich + Veg Cutlet)', components: ['Cheese sandwich 60gms  (1st AC&EC)', 'Veg Cutlet(VB) 100GM'] },
  { code: 'FG007', name: 'Breakfast 7 (Veg Cutlet + Veg Sandwich)', components: ['Veg Cutlet(VB) 100GM', 'Veg Sandwich (60gms)'] },
  { code: 'FG008', name: 'Breakfast 8 (Kachori + Veg Cutlet)', components: ['KACHORI(VB)60GM', 'Veg Cutlet(VB) 100GM'] },
  { code: 'FG009', name: 'Breakfast 9 (Boiled Veg + Veg Cutlet)', components: ['Boiled Veg (50 gms)', 'Veg Cutlet(VB) 100GM'] },
  { code: 'FG010', name: 'Breakfast 10 (Ajwain Paratha + Aloo Bhaji + Veg Cutlet)', components: ['Ajwain paratha(VB) 100GM', 'Aloo Bhaji(VB) 60GM', 'Veg Cutlet(VB) 100GM'] },
  { code: 'FG011', name: 'Breakfast 11 (Paneer Cutlet + Veg Upma)', components: ['Paneer Cutlet 100GM', 'VEG UPMA(VB) 150 GM'] },
  { code: 'FG012', name: 'Breakfast 12 (Omlette + Veg Cutlet)', components: ['Omlet(VB) 100GM', 'Veg Cutlet(VB) 100GM'] },
  { code: 'FG013', name: 'Breakfast 13 (Aloo Paratha + Veg Cutlet)', components: ['Aloo Paratha (Vb)150GM', 'Veg Cutlet(VB) 100GM'] }
];

const fgSfgRecipes = [];
const fgItems = [];

breakfastCombos.forEach(cb => {
  fgItems.push({
    code: cb.code,
    name: cb.name,
    type: 'FG',
    group: 'Breakfast',
    unit: 'portion',
    active: true
  });

  cb.components.forEach(compName => {
    // Find matching SFG item with normalized string comparison
    const normComp = compName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let sfg = null;

    // 1. Direct match or key containment
    for (const [key, item] of Object.entries(sfgItemsMap)) {
      const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKey === normComp || normKey.includes(normComp) || normComp.includes(normKey)) {
        sfg = item;
        break;
      }
    }

    // 2. Specialized keyword matching if direct match fails
    if (!sfg) {
      for (const [key, item] of Object.entries(sfgItemsMap)) {
        if (normComp.includes('alooparatha') && key.includes('aloo paratha')) sfg = item;
        else if (normComp.includes('paneercutlet') && key.includes('paneer cutlet')) sfg = item;
        else if (normComp.includes('vegcutlet') && key.includes('veg cutlet') && key.includes('vb')) sfg = item;
        else if ((normComp.includes('omlet') || normComp.includes('omlette')) && key.includes('omlet')) sfg = item;
        else if (normComp.includes('vegupma') && key.includes('veg upma')) sfg = item;
        else if (normComp.includes('cheesesandwich') && key.includes('cheese sandwich')) sfg = item;
        else if (normComp.includes('vegsandwich') && key.includes('veg sandwich')) sfg = item;
        else if (normComp.includes('poha') && key.includes('poha')) sfg = item;
        else if (normComp.includes('ajwain') && key.includes('ajwain')) sfg = item;
        else if (normComp.includes('aloobhaji') && key.includes('aloo bhaji')) sfg = item;
        if (sfg) break;
      }
    }

    // 3. Fallback: Create SFG item if missing (e.g. Boiled Veg, Kachori)
    if (!sfg) {
      const code = `SFG${String(sfgIndex++).padStart(4, '0')}`;
      sfg = { code, name: compName, group: 'Breakfast' };
      sfgItemsMap[compName.toLowerCase()] = sfg;
      console.log(`Auto-created missing SFG item for Breakfast combo: ${compName} (${code})`);
    }

    fgSfgRecipes.push({
      id: `bom-${cb.code}-${sfg.code}`,
      parentCode: cb.code,
      componentType: 'SFG',
      componentCode: sfg.code,
      basisQty: 1,
      qty: 1,
      unit: 'portion',
      effectiveFrom: '2026-09-01',
      effectiveTo: '',
      kitchenId: ''
    });
  });
});

console.log(`Generated ${fgItems.length} FG items.`);
console.log(`Generated ${fgSfgRecipes.length} FG -> SFG recipe lines.`);

// Build final JSON structures
const materials = Object.values(materialsMap).map(m => ({
  code: m.code,
  name: m.name,
  unit: m.uom,
  active: true
}));

const rates = Object.values(materialsMap).map(m => ({
  id: `rate-${m.code}`,
  materialCode: m.code,
  kitchenId: '',
  rate: m.rate,
  effectiveFrom: '2026-09-01',
  imported: true
}));

const sfgItemsList = Object.values(sfgItemsMap).map(s => ({
  code: s.code,
  name: s.name,
  type: 'SFG',
  group: s.group,
  unit: 'portion',
  active: true
}));

const allItems = [...fgItems, ...sfgItemsList];
const allRecipes = [...fgSfgRecipes, ...materialRecipes];

const finalDb = {
  kitchens: [{ id: "k-howrah", code: "HWH", name: "Howrah", zone: "East", active: true }],
  units: ["KG", "L", "EA", "GM", "ML", "portion"].map(c => ({ code: c, name: c })),
  materials,
  rates,
  items: allItems,
  recipes: allRecipes,
  demand: [],
  stock: [],
  expenses: [
    { id: "exp-bf", serviceGroup: "Breakfast", amount: 0, effectiveFrom: "2026-09-01", kitchenId: "" },
    { id: "exp-ld", serviceGroup: "Lunch & Dinner", amount: 0, effectiveFrom: "2026-09-01", kitchenId: "" }
  ]
};

const seedPath = path.join(__dirname, '..', 'data', 'seed', 'howrah.json');
const dbPath = path.join(__dirname, '..', 'data', 'db.json');

fs.writeFileSync(seedPath, JSON.stringify(finalDb, null, 1));
fs.writeFileSync(dbPath, JSON.stringify(finalDb, null, 1));

console.log('--- Database Successfully Built & Written ---');
console.log(`Materials: ${materials.length}`);
console.log(`Rates: ${rates.length}`);
console.log(`Total Items: ${allItems.length} (${fgItems.length} FG, ${sfgItemsList.length} SFG)`);
console.log(`Total Recipes: ${allRecipes.length} (${fgSfgRecipes.length} FG->SFG, ${materialRecipes.length} SFG->Material)`);
