"use client";
import { useState } from "react";
import { Shell, Section, Kpi, Issues, Loading, Empty, Table, Filters } from "@/components/ui"; import { useDb } from "@/lib/useDb"; import { plan, actuals, fmt, inr, today, zonesOf, GROUPS } from "@/lib/engine";
export default function Plan() {
  const { db } = useDb(); const [f, setF] = useState({ date: today(), zone: "", kitchen: "" }); const [a, setA] = useState(f);
  if (!db) return <Shell eyebrow="PLAN & PREPARE" title="Production plan"><Loading /></Shell>;
  const p = plan(db, { from: a.date, to: a.date, zone: a.zone, kitchenId: a.kitchen }), ac = actuals(db, { from: a.date, to: a.date, ids: p.ids });
  const groups = [...new Set([...GROUPS, ...p.fg.map(x => x.group)])];
  const missing = p.issues.filter(i => i.type === "missing-rate");
  return <Shell eyebrow="PLAN & PREPARE" title="Production plan" sub="Turn meal demand into a kitchen-ready prep and ingredient plan. Calculated from effective recipes for the selected date.">
    <Filters f={f} setF={setF} onApply={() => setA(f)} zones={zonesOf(db)} kitchens={db.kitchens} label="Build plan" />
    <div className="kpis"><Kpi label="Kitchens" value={p.kitchens.length} /><Kpi label="Meals planned" value={fmt(p.meals, 0)} /><Kpi label="Menu lines" value={p.fg.length} /><Kpi label="Prep components" value={p.sfg.length} /><Kpi label="BOM material value" value={inr(p.value)} /></div>
    <Issues issues={p.issues} />
    <Section eyebrow="SERVICE MIX" title="Meal group summary" note="Planned meals and BOM material value by service group">
      <Table head={["Service group","#Meals planned","#BOM cost / meal","#BOM material value"]}>{groups.map(g => { const x = p.groups.find(y => y.group === g); return <tr key={g}><td>{g}</td><td className="r">{fmt(x?.meals || 0, 0)}</td><td className="r">{inr(x?.matPerMeal || 0)}</td><td className="r">{inr(x?.material || 0)}</td></tr>; })}</Table></Section>
    <Section eyebrow="01 · DEMAND" title="Menu quantities" note="Finished items required for the selected kitchens and service date">
      <Table head={["Kitchen","Service group","FG / menu","#Meal qty","UOM"]} empty={!p.perKitchen.length && <Empty title="No meal demand for this date">Enter quantities on the Meal demand page, or change the date above.</Empty>}>
        {p.perKitchen.flatMap(k => k.fg.map(x => <tr key={k.kitchen.id + x.code}><td>{k.kitchen.name}</td><td>{x.group}</td><td>{x.name}</td><td className="r">{fmt(x.qty, 0)}</td><td>{x.unit}</td></tr>))}</Table></Section>
    <Section eyebrow="02 · SFG PLAN" title="Prep quantities" note="Semi-finished components to prepare, consolidated by kitchen">
      <Table head={["Kitchen","SFG / prep","#Required qty","Output UOM","Used by FG"]} empty={!p.perKitchen.some(k => k.sfg.length) && <Empty title="No prep items needed">No recipe uses a shared SFG for this plan. Link them under Recipes & masters → FG → SFG BOM.</Empty>}>
        {p.perKitchen.flatMap(k => k.sfg.map(s => <tr key={k.kitchen.id + s.code}><td>{k.kitchen.name}</td><td>{s.name}</td><td className="r">{fmt(s.qty)}</td><td>{s.unit}</td><td>{s.usedBy.join(", ")}</td></tr>))}</Table></Section>
    <Section eyebrow="03 · MATERIALS" title="Ingredient requirements" note="Gross material quantities from direct menu recipes and shared SFG recipes, with actual use and variance">
      <Table head={["Kitchen","Raw material","UOM",...groups.map(g => "#" + g),"#Ideal total","#Rate","#Actual","#Variance"]} empty={!p.perKitchen.some(k => k.mat.length) && <Empty title="No ingredients to show">Ingredients appear once demand and recipes exist.</Empty>}>
        {p.perKitchen.flatMap(k => k.mat.map(m => { const x = ac.byKey[k.kitchen.id + "|" + m.code]; const rate = m.valued ? m.value / m.valued : null;
          return <tr key={k.kitchen.id + m.code}><td>{k.kitchen.name}</td><td>{m.name}</td><td>{m.unit}{m.recipeUnits ? <span className="pos"> (recipe: {[...m.recipeUnits].join(", ")})</span> : ""}</td>{groups.map(g => <td key={g} className="r">{fmt(m.byGroup[g] || 0)}</td>)}<td className="r"><b>{fmt(m.qty)}</b></td><td className="r">{rate == null ? <span className="pos">Missing</span> : fmt(rate)}</td><td className="r">{x ? fmt(x.qty) : "—"}</td><td className={"r " + (x && x.qty - m.qty > 0 ? "pos" : "neg")}>{x ? fmt(x.qty - m.qty) : "—"}</td></tr>; }))}</Table></Section>
  </Shell>;
}
