"""Reads the Howrah workbook (read-only) and writes data/seed/howrah.json + a review report.
Nothing is guessed: anything unclear is written to review[]."""
import json, re, sys, collections
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter as L

SRC = sys.argv[1]; OUT = sys.argv[2]
wv = load_workbook(SRC, data_only=True, read_only=False)
wf = load_workbook(SRC, data_only=False, read_only=False)
review = []
def flag(kind, msg, ref=""): review.append({"kind": kind, "message": msg, "ref": ref})
norm = lambda s: re.sub(r"\s+", " ", str(s or "")).strip().upper()
num = lambda v: v if isinstance(v, (int, float)) and not isinstance(v, bool) else None

pi, pif = wv["Production Indent"], wf["Production Indent"]
bf, ld = wv[" Breakfast-recipe"], wv[" L&D-receipe"]

# --- FG columns of Production Indent (G..BG) ---
fgs = []
for c in range(7, 60):
    name = pi.cell(11, c).value
    if not name: continue
    f12 = str(pif.cell(12, c).value or "")
    src = "BF" if "Breakfast-recipe" in f12 else "LD" if "L&D-receipe" in f12 else None
    grp = pi.cell(10, c).value
    qty = num(pi.cell(9, c).value)
    qf = pif.cell(9, c).value
    fgs.append(dict(col=L(c), name=str(name).strip(), group=grp, src=src, qty=qty,
                    qtyFormula=qf if isinstance(qf, str) else None))
    if src is None: flag("recipe-source", f"Column {L(c)} '{name}' has no recognisable recipe lookup.", L(c))
    if isinstance(qf, str): flag("demand-formula", f"Meals qty for '{name}' is a typed calculation ({qf}) — confirm {qty}.", L(c)+"9")
    if qty is None: flag("demand-missing", f"'{name}' has no meals quantity in the workbook.", L(c)+"9")
names = collections.Counter((f["name"], f["src"]) for f in fgs)
for (n, s), k in names.items():
    if k > 1: flag("duplicate-menu", f"Menu '{n}' appears {k} times using the same recipe sheet (different service groups). Each gets its own FG code; confirm.", n)
byname = collections.defaultdict(set)
for f in fgs: byname[f["name"]].add(f["group"])
for n, g in byname.items():
    if len(g) > 1: flag("group-conflict", f"Menu '{n}' is listed under several service groups: {sorted(map(str,g))}.", n)
for f in fgs:
    if f["src"] == "BF" and f["group"] != "Breakfast" and f["group"] != "Hi-Tea":
        flag("group-vs-recipe", f"'{f['name']}' is typed '{f['group']}' but uses the Breakfast recipe sheet.", f["col"])

# --- recipe lines ---
lines = []
for r in range(3, bf.max_row + 1):
    m, it, base, comp, uom, port = (bf.cell(r, c).value for c in (1, 2, 3, 4, 5, 8))
    if not m or not it: continue
    lines.append(dict(src="BF", menu=str(m).strip(), comp=str(it).strip(), qty=num(comp), unit=norm(uom), portions=num(port), row=r))
for r in range(2, ld.max_row + 1):
    m, it, q, u, p = (ld.cell(r, c).value for c in (6, 7, 10, 11, 12))
    if not m or not it: continue
    lines.append(dict(src="LD", menu=str(m).strip(), comp=str(it).strip(), qty=num(q), unit=norm(u), portions=num(p), row=r,
                      base=ld.cell(r, 1).value))
bases = collections.Counter(l.get("base") for l in lines if l["src"] == "LD")
flag("recipe-base", f"L&D recipe rows are tagged with base(s) {dict(bases)} — not Howrah. The workbook applies them to Howrah anyway; confirm they are valid for Howrah.", "L&D-receipe!A")

# --- rates (Production Indent C:E) ---
rates = {}
for r in range(12, pi.max_row + 1):
    n, u, rt = pi.cell(r, 3).value, pi.cell(r, 4).value, num(pi.cell(r, 5).value)
    if not n: continue
    rates[norm(n)] = dict(name=str(n).strip(), unit=norm(u), rate=rt, row=r)
    if rt is None: flag("rate-missing", f"No rate for '{n}'.", f"E{r}")

# --- materials from recipes + rates ---
mat = {}
for l in lines:
    k = norm(l["comp"]); mat.setdefault(k, dict(name=l["comp"], units=set()))["units"].add(l["unit"])
for k, v in rates.items():
    mat.setdefault(k, dict(name=v["name"], units=set()))
materials = []; rate_rows = []
for i, (k, v) in enumerate(sorted(mat.items()), 1):
    code = f"MAT{i:04d}"
    rt = rates.get(k)
    ru = rt["unit"] if rt else None
    units = sorted(u for u in v["units"] if u)
    unit = ru or (units[0] if units else "")
    materials.append(dict(code=code, name=v["name"], unit=unit))
    if not rt: flag("rate-missing", f"Material '{v['name']}' is used in recipes but has no rate in the workbook.", k)
    else:
        rate_rows.append(dict(materialCode=code, rate=rt["rate"], unit=ru))
        bad = [u for u in units if u != ru]
        if bad: flag("unit-conflict", f"'{v['name']}': rate unit is {ru} but recipes use {bad}. No conversion given — not converted; lines are excluded from value until you set a conversion.", k)
    if len(units) > 1: flag("unit-conflict", f"'{v['name']}' is used with several units in recipes: {units}.", k)
mcode = {norm(m["name"]): m["code"] for m in materials}
funits = {"KG", "L", "EA", "GM", "ML", "PCS"}

# --- FG list & recipes ---
items, recipes = [], []
for i, f in enumerate(fgs, 1):
    f["code"] = f"FG{i:03d}"
    items.append(dict(code=f["code"], name=f["name"], type="FG", group=f["group"] or "Unassigned", unit="portion", active=True))
    mine = [l for l in lines if l["src"] == f["src"] and norm(l["menu"]) == norm(f["name"])]
    if not mine: flag("recipe-missing", f"No recipe rows found for '{f['name']}'.", f["col"])
    seen = collections.Counter(norm(l["comp"]) for l in mine)
    for k, n in seen.items():
        if n > 1: flag("recipe-duplicate", f"'{f['name']}' lists '{k}' {n} times; the workbook adds them together, so the app does too — confirm.", f["name"])
    for l in mine:
        if l["qty"] is None: flag("recipe-qty", f"'{f['name']}' / '{l['comp']}' has no numeric quantity.", str(l["row"])); continue
        if not l["portions"] or l["portions"] <= 0:
            flag("invalid-basis", f"'{f['name']}' / '{l['comp']}' has no valid portion basis; imported as 0 so it is blocked until fixed.", str(l["row"]))
        elif l["portions"] != 100:
            flag("basis-vs-formula", f"'{f['name']}' / '{l['comp']}': recipe says {l['portions']} portions but the workbook formula always divides by 100. App uses the recipe's own basis ({l['portions']}); the workbook would give a different (likely wrong) answer.", str(l["row"]))
        recipes.append(dict(parentCode=f["code"], componentType="MATERIAL", componentCode=mcode[norm(l["comp"])],
                            basisQty=l["portions"] or 0, qty=l["qty"], unit=l["unit"], source=f"{l['src']} row {l['row']}"))
listed = {(f["src"], norm(f["name"])) for f in fgs}
extra = sorted({(l["src"], l["menu"]) for l in lines if (l["src"], norm(l["menu"])) not in listed})
for s, m in extra: flag("recipe-no-demand", f"Recipe '{m}' ({'Breakfast' if s=='BF' else 'L&D'} sheet) has no column in Production Indent, so it was not imported as a menu item.", m)

flag("sfg", "Recipe sheets contain SFG/Bulk codes (e.g. SFG0000581) and unlabelled 'batch' columns, but no SFG-to-material structure the workbook itself uses. No SFG BOMs were created.", "L&D-receipe!C,E,H,I")
flag("demand-dates", "Meals quantities in Production Indent are one total per menu (the indent summary is titled 'August') with no service dates. Pick a date when loading.", "Production Indent!row 9")
flag("rate-date", "Rates have no effective date in the workbook. The import date you choose is used.", "Production Indent!E")
flag("meal-count", "Workbook meal counts (Breakfast 32,554; Lunch & Dinner 25,473; Staff 6,165) are not the sum of menu-item quantities (a lunch meal has rice, dal, veg…). The app plans in menu-item portions, so its portion total will not equal the workbook meal count.", "indent summary!G7:J7")
flag("actuals", "Actual Consumption / P&L columns in indent summary are empty; no opening, purchase or closing stock exists to import.", "indent summary!M:P")
flag("correction-sheet", "Hidden sheet 'To be correction in system' lists names needing fixes: " + ", ".join(str(wv["To be correction in system"].cell(r,1).value) for r in range(1,10)) + ". Not applied.", "hidden sheet")
flag("hidden", "Hidden sheets b-64 and other expenses were not used.", "hidden")

json.dump(dict(kitchen="Howrah", materials=materials, rates=rate_rows, items=items, recipes=recipes,
               demand=[dict(itemCode=f["code"], qty=f["qty"], col=f["col"], name=f["name"]) for f in fgs if f["qty"]],
               review=review), open(OUT, "w"), indent=1)
c = collections.Counter(r["kind"] for r in review)
print(len(items), "FG", len(materials), "materials", len(rate_rows), "rates", len(recipes), "recipe lines", sum(1 for f in fgs if f["qty"]), "demand rows")
print(dict(c))
