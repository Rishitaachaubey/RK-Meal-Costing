"use client";
import { useState } from "react";
import { Shell, Section, Kpi, Table, Empty } from "@/components/ui";
import { fmt, inr, calculateSfgBomConversion } from "@/lib/engine";

const DEFAULT_SFGS = [
  { id: 'sfg_1', name: 'Chicken', category: 'Chicken', scope: 'Non-Veg', cost: 28.00, qty: 50 },
  { id: 'sfg_2', name: 'Paneer', category: 'Paneer', scope: 'Veg', cost: 22.00, qty: 100 },
  { id: 'sfg_3', name: 'Mix Veg', category: 'Mix Veg', scope: 'Common', cost: 6.00, qty: 150 },
  { id: 'sfg_4', name: 'Dal', category: 'Dal', scope: 'Common', cost: 7.00, qty: 150 },
  { id: 'sfg_5', name: 'Roti', category: 'Roti', scope: 'Common', cost: 6.50, qty: 150 },
  { id: 'sfg_6', name: 'Rice', category: 'Rice', scope: 'Common', cost: 3.00, qty: 150 }
];

export default function SfgConversionPage() {
  const [sfgs, setSfgs] = useState(DEFAULT_SFGS);
  const [vegIndicatorId, setVegIndicatorId] = useState('sfg_2');
  const [nonVegIndicatorId, setNonVegIndicatorId] = useState('sfg_1');
  const [activeTab, setActiveTab] = useState('conversion');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formScope, setFormScope] = useState('Common');
  const [formCost, setFormCost] = useState('');
  const [formQty, setFormQty] = useState('');

  const res = calculateSfgBomConversion(sfgs, vegIndicatorId, nonVegIndicatorId);

  const resetPreset = () => {
    setSfgs(JSON.parse(JSON.stringify(DEFAULT_SFGS)));
    setVegIndicatorId('sfg_2');
    setNonVegIndicatorId('sfg_1');
  };

  const handleCostChange = (id, newCost) => {
    setSfgs(prev => prev.map(s => s.id === id ? { ...s, cost: Math.max(0, +newCost || 0) } : s));
  };

  const handleQtyChange = (id, newQty) => {
    setSfgs(prev => prev.map(s => s.id === id ? { ...s, qty: Math.max(0, +newQty || 0) } : s));
  };

  const openAddModal = () => {
    setEditItem(null);
    setFormName('');
    setFormCategory('');
    setFormScope('Common');
    setFormCost('');
    setFormQty('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormScope(item.scope);
    setFormCost(item.cost);
    setFormQty(item.qty);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (sfgs.length <= 1) {
      alert("At least one SFG is required.");
      return;
    }
    setSfgs(prev => prev.filter(s => s.id !== id));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editItem) {
      setSfgs(prev => prev.map(s => s.id === editItem.id ? {
        ...s,
        name: formName.trim(),
        category: formCategory.trim() || formName.trim(),
        scope: formScope,
        cost: +formCost || 0,
        qty: +formQty || 0
      } : s));
    } else {
      const newId = 'sfg_' + Date.now();
      setSfgs(prev => [...prev, {
        id: newId,
        name: formName.trim(),
        category: formCategory.trim() || formName.trim(),
        scope: formScope,
        cost: +formCost || 0,
        qty: +formQty || 0
      }]);
    }

    setShowModal(false);
  };

  const exportCsv = () => {
    let csv = 'SFG Name,Scope,Category,Per-Meal Cost (INR),Non-Veg Wt %,Veg Wt %,Blended Contribution %,Punched Qty,FG Meal Output\n';
    res.computedSfgs.forEach(i => {
      csv += `"${i.name}","${i.scope}","${i.category}",${i.cost.toFixed(2)},${(i.nonVegWt*100).toFixed(2)}%,${(i.vegWt*100).toFixed(2)}%,${(i.blendedContribution*100).toFixed(2)}%,${i.qty},${i.fgMealContribution.toFixed(2)}\n`;
    });
    csv += `\nTotal,,,,,100%,${res.totalPunchedQty},${res.totalFgMeals.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOM_Weight_FG_Conversion_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const isMatched = Math.abs(res.totalFgMeals - res.totalLdMeals) < 0.05;

  return (
    <Shell
      eyebrow="PRODUCTION CONTROL"
      title="BOM Weight & FG Meal Conversion"
      sub="Convert punched Semi-Finished Goods (SFG) quantities into equivalent Finished Goods (FG) meal output using dynamic BOM weights."
    >
      {/* Top Actions & Preset Controls */}
      <div className="filters" style={{ marginBottom: "1.25rem" }}>
        <button className="ghost" onClick={resetPreset}>
          🔄 Load PDF Worked Example
        </button>
        <button className="ghost" onClick={exportCsv}>
          📥 Export Audit CSV
        </button>
        <button onClick={openAddModal} style={{ marginLeft: "auto" }}>
          + Add New SFG
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="kpis">
        <Kpi
          label="Total Punched Qty"
          value={fmt(res.totalPunchedQty, 0)}
          sub="Portions punched"
        />
        <Kpi
          label="Veg Share"
          value={`${(res.vegShare * 100).toFixed(2)}%`}
          sub={`${res.vegMeals} meals (₹${res.vegBomCost.toFixed(2)} BOM)`}
        />
        <Kpi
          label="Non-Veg Share"
          value={`${(res.nonVegShare * 100).toFixed(2)}%`}
          sub={`${res.nonVegMeals} meals (₹${res.nonVegBomCost.toFixed(2)} BOM)`}
        />
        <Kpi
          label="Calculated FG Meals"
          value={fmt(res.totalFgMeals, 2)}
          sub={isMatched ? "✓ 100% Matched to target" : `Target expected: ${res.totalLdMeals} meals`}
          tone={isMatched ? "" : "red"}
        />
      </div>

      {/* Meal Mix Configuration Section */}
      <Section
        eyebrow="MEAL MIX INDICATORS"
        title="Veg vs Non-Veg Portion Ratio"
        note="Select the main protein/dish SFGs that determine total Veg and Non-Veg meal volume."
      >
        <div className="panel" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.85rem" }}>
            <b>Veg Main SFG (Determines Veg Count):</b>
            <select
              value={vegIndicatorId}
              onChange={e => setVegIndicatorId(e.target.value)}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "6px" }}
            >
              {sfgs.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.qty} portions)</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.85rem" }}>
            <b>Non-Veg Main SFG (Determines Non-Veg Count):</b>
            <select
              value={nonVegIndicatorId}
              onChange={e => setNonVegIndicatorId(e.target.value)}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "6px" }}
            >
              {sfgs.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.qty} portions)</option>
              ))}
            </select>
          </label>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.3rem" }}>
              <span style={{ color: "#10b981", fontWeight: "bold" }}>Veg: {(res.vegShare * 100).toFixed(2)}%</span>
              <span style={{ color: "#f59e0b", fontWeight: "bold" }}>Non-Veg: {(res.nonVegShare * 100).toFixed(2)}%</span>
            </div>
            <div style={{ display: "flex", height: "10px", borderRadius: "5px", overflow: "hidden", background: "#334155" }}>
              <div style={{ width: `${(res.vegShare * 100)}%`, background: "#10b981", transition: "width 0.3s" }} />
              <div style={{ width: `${(res.nonVegShare * 100)}%`, background: "#f59e0b", transition: "width 0.3s" }} />
            </div>
          </div>
        </div>
      </Section>

      {/* SFG Entry Table */}
      <Section
        eyebrow="SFG PUNCHING ENTRY"
        title="Semi-Finished Goods Rate & Quantity Input"
        note="Update per-meal cost rates or punched quantities directly in the table."
      >
        <Table
          head={["SFG Item Name", "Category / Group", "Meal Scope", "#Per-Meal Cost (₹)", "#Punched Qty", "Actions"]}
          empty={!sfgs.length && <Empty title="No SFGs configured">Add an SFG using the button above.</Empty>}
        >
          {sfgs.map(sfg => (
            <tr key={sfg.id}>
              <td><b>{sfg.name}</b></td>
              <td>{sfg.category}</td>
              <td>
                <span className="tag" style={{
                  background: sfg.scope === 'Non-Veg' ? 'rgba(245, 158, 11, 0.2)' : sfg.scope === 'Veg' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: sfg.scope === 'Non-Veg' ? '#fbbf24' : sfg.scope === 'Veg' ? '#34d399' : '#60a5fa',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {sfg.scope}
                </span>
              </td>
              <td className="r">
                <input
                  type="number"
                  step="0.5"
                  value={sfg.cost}
                  onChange={e => handleCostChange(sfg.id, e.target.value)}
                  style={{ width: "80px", textAlign: "right", padding: "2px 4px" }}
                />
              </td>
              <td className="r">
                <input
                  type="number"
                  step="1"
                  value={sfg.qty}
                  onChange={e => handleQtyChange(sfg.id, e.target.value)}
                  style={{ width: "80px", textAlign: "right", padding: "2px 4px" }}
                />
              </td>
              <td>
                <button className="lnk" onClick={() => openEditModal(sfg)}>Edit</button>
                <button className="lnk d" onClick={() => handleDelete(sfg.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* Conversion & Grouping Breakdown Tabs */}
      <Section
        eyebrow="CALCULATION OUTPUT"
        title="SFG Weight & FG Conversion Breakdown"
        note="View individual SFG contributions and aggregated category rollups."
      >
        <div className="tabs" style={{ marginBottom: "1rem" }}>
          <button className={activeTab === 'conversion' ? 'on' : ''} onClick={() => setActiveTab('conversion')}>
            FG Conversion Table
          </button>
          <button className={activeTab === 'grouping' ? 'on' : ''} onClick={() => setActiveTab('grouping')}>
            SFG Category Rollup
          </button>
        </div>

        {activeTab === 'conversion' && (
          <Table
            head={["SFG Name", "Scope", "#Cost (₹)", "#Non-Veg Wt %", "#Veg Wt %", "#Blended Wt %", "#Punched Qty", "#FG Meal Output"]}
          >
            {res.computedSfgs.map(item => (
              <tr key={item.id}>
                <td><b>{item.name}</b></td>
                <td>{item.scope}</td>
                <td className="r">{inr(item.cost)}</td>
                <td className="r">{item.scope === 'Veg' ? '—' : `${(item.nonVegWt * 100).toFixed(2)}%`}</td>
                <td className="r">{item.scope === 'Non-Veg' ? '—' : `${(item.vegWt * 100).toFixed(2)}%`}</td>
                <td className="r"><b>{(item.blendedContribution * 100).toFixed(2)}%</b></td>
                <td className="r">{item.qty}</td>
                <td className="r"><b style={{ color: "#10b981" }}>{fmt(item.fgMealContribution, 2)}</b></td>
              </tr>
            ))}
            <tr>
              <td colspan="5"><b>TOTAL FG CONVERSION SUMMARY</b></td>
              <td className="r"><b>100.00%</b></td>
              <td className="r"><b>{res.totalPunchedQty}</b></td>
              <td className="r"><b style={{ color: "#10b981", fontSize: "1.1rem" }}>{fmt(res.totalFgMeals, 2)} Meals</b></td>
            </tr>
          </Table>
        )}

        {activeTab === 'grouping' && (
          <Table
            head={["Category / Group", "Mapped SFGs", "#Category Qty", "#Category Wt %", "#Total FG Meals"]}
          >
            {res.categories.map(cat => (
              <tr key={cat.category}>
                <td><b>{cat.category}</b></td>
                <td>{cat.sfgs.join(', ')}</td>
                <td className="r">{cat.totalQty}</td>
                <td className="r"><b>{(cat.categoryContributionPct * 100).toFixed(2)}%</b></td>
                <td className="r"><b style={{ color: "#10b981" }}>{fmt(cat.totalFgMeals, 2)} Meals</b></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {/* Step-by-Step Audit Trace */}
      <Section
        eyebrow="MATHEMATICAL AUDIT LOG"
        title="Step-by-Step Calculation Trace"
        note="Complete mathematical breakdown matching project specification standards."
      >
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1rem", borderRadius: "8px" }}>
            <h4 style={{ color: "#38bdf8", marginBottom: "0.4rem" }}>Step 1: Veg / Non-Veg Share of Meals</h4>
            <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "#cbd5e1" }}>
              Total L&D Meals = Veg Meals ({res.vegMeals}) + Non-Veg Meals ({res.nonVegMeals}) = <b>{res.totalLdMeals} meals</b><br/>
              Veg Share = {res.vegMeals} / {res.totalLdMeals} = <b style={{ color: "#10b981" }}>{(res.vegShare * 100).toFixed(2)}%</b> | 
              Non-Veg Share = {res.nonVegMeals} / {res.totalLdMeals} = <b style={{ color: "#f59e0b" }}>{(res.nonVegShare * 100).toFixed(2)}%</b>
            </p>
          </div>

          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1rem", borderRadius: "8px" }}>
            <h4 style={{ color: "#38bdf8", marginBottom: "0.4rem" }}>Step 2: Meal BOM Cost Summation</h4>
            <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "#cbd5e1" }}>
              Non-Veg Meal BOM Cost (Chicken + Common SFGs) = <b style={{ color: "#f59e0b" }}>₹{res.nonVegBomCost.toFixed(2)}</b><br/>
              Veg Meal BOM Cost (Paneer + Common SFGs) = <b style={{ color: "#10b981" }}>₹{res.vegBomCost.toFixed(2)}</b>
            </p>
          </div>

          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1rem", borderRadius: "8px" }}>
            <h4 style={{ color: "#38bdf8", marginBottom: "0.4rem" }}>Step 3: SFG Contribution Calculation</h4>
            <ul style={{ fontSize: "0.85rem", lineHeight: 1.8, color: "#cbd5e1", paddingLeft: "1.2rem" }}>
              {res.computedSfgs.map(i => (
                <li key={i.id}>
                  <b>{i.name} ({i.scope})</b>: {
                    i.scope === 'Non-Veg' ? `₹${i.cost} / ₹${res.nonVegBomCost.toFixed(2)} = ${(i.blendedContribution*100).toFixed(2)}%` :
                    i.scope === 'Veg' ? `₹${i.cost} / ₹${res.vegBomCost.toFixed(2)} = ${(i.blendedContribution*100).toFixed(2)}%` :
                    `Veg (${(i.vegWt*100).toFixed(2)}% × ${(res.vegShare*100).toFixed(2)}%) + Non-Veg (${(i.nonVegWt*100).toFixed(2)}% × ${(res.nonVegShare*100).toFixed(2)}%) = ${(i.blendedContribution*100).toFixed(2)}%`
                  }
                </li>
              ))}
            </ul>
          </div>

          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1rem", borderRadius: "8px" }}>
            <h4 style={{ color: "#38bdf8", marginBottom: "0.4rem" }}>Step 4: FG Conversion & Reconciliation</h4>
            <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "#cbd5e1" }}>
              Total FG Meal = Σ (SFG Quantity × SFG Contribution) = <b style={{ color: "#10b981", fontSize: "1.05rem" }}>{fmt(res.totalFgMeals, 2)} Meals</b><br/>
              Validation against Expected Target ({res.totalLdMeals} meals): {
                isMatched ? '✅ 100% Exact Match Confirmed!' : '⚠️ Variance detected between punched FG output and meal count.'
              }
            </p>
          </div>
        </div>
      </Section>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div className="panel" style={{ width: "100%", maxWidth: "420px", background: "#0f172a", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3>{editItem ? "Edit SFG Item" : "Add New SFG Item"}</h3>
              <button className="ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <label>
                Name:
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required placeholder="e.g. Kadhai Paneer" style={{ width: "100%", padding: "0.4rem" }} />
              </label>
              <label>
                Category / Group:
                <input type="text" value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="e.g. Paneer" style={{ width: "100%", padding: "0.4rem" }} />
              </label>
              <label>
                Meal Scope:
                <select value={formScope} onChange={e => setFormScope(e.target.value)} style={{ width: "100%", padding: "0.4rem" }}>
                  <option value="Non-Veg">Exclusive Non-Veg</option>
                  <option value="Veg">Exclusive Veg</option>
                  <option value="Common">Common (Both Veg & Non-Veg)</option>
                </select>
              </label>
              <label>
                Per-Meal Cost (₹):
                <input type="number" step="0.01" value={formCost} onChange={e => setFormCost(e.target.value)} required placeholder="22.00" style={{ width: "100%", padding: "0.4rem" }} />
              </label>
              <label>
                Punched Quantity (Portions):
                <input type="number" step="0.1" value={formQty} onChange={e => setFormQty(e.target.value)} required placeholder="100" style={{ width: "100%", padding: "0.4rem" }} />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button type="button" className="ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit">Save SFG</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
