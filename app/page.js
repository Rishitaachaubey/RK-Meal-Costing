"use client";
import { useState } from "react"; import Link from "next/link";
import { Shell, Section, Kpi, Issues, Loading, Empty, Table, Filters } from "@/components/ui"; import { useDb } from "@/lib/useDb"; import { compare, fmt, inr, today, zonesOf, GROUPS } from "@/lib/engine";
export default function Overview() {
  const { db } = useDb(); const [f, setF] = useState({ date: today(), zone: "", kitchen: "" }); const [a, setA] = useState(f);
  if (!db) return <Shell eyebrow="OPERATIONS OVERVIEW" title="Good planning starts here."><Loading /></Shell>;
  const c = compare(db, { from: a.date, to: a.date, zone: a.zone, kitchenId: a.kitchen }), p = c.p;
  const idealPer = p.meals ? (p.value + p.direct) / p.meals : 0, actPer = p.meals && c.hasActual ? (c.actualValue + p.direct) / p.meals : null, varc = c.hasActual ? c.actualValue - p.value : null;
  const groups = [...new Set([...GROUPS, ...p.fg.map(x => x.group)])];
  return <Shell eyebrow="OPERATIONS OVERVIEW" title="Good planning starts here." sub="See the day’s meal demand, ingredient plan, and kitchen performance in one place.">
    <Filters f={f} setF={setF} onApply={() => setA(f)} zones={zonesOf(db)} kitchens={db.kitchens} />
    {!db.kitchens.length && <div className="info">Start in <Link href="/masters">Recipes & masters</Link>: add a kitchen, materials, menu items and recipes. Or load the Howrah / demo data from <Link href="/demand">Meal demand</Link>.</div>}
    <div className="kpis"><Kpi label="Meals" value={fmt(p.meals, 0)} /><Kpi label="Ideal cost / meal" value={inr(idealPer)} /><Kpi label="Actual cost / meal" value={inr(actPer)} sub={c.hasActual ? "" : "No stock entered"} />
      <Kpi label="Ideal material cost" value={inr(p.value)} /><Kpi label="Cost variance" value={varc == null ? "—" : (varc >= 0 ? "+ " : "− ") + inr(Math.abs(varc))} tone={varc > 0 ? "red" : ""} /></div>
    <Issues issues={c.issues} />
    <Section eyebrow="MENU ECONOMICS" title="Cost by service" note="Recipe cost includes direct menu recipes and shared SFG BOMs.">
      <div className="cards">{groups.map(g => { const x = p.groups.find(y => y.group === g); return <Kpi key={g} tone="sm" label={g} value={inr(x?.perMeal || 0)} sub={`${fmt(x?.meals || 0, 0)} meals`} />; })}</div></Section>
    <Section eyebrow="FINISHED MENU COST" title="Finished menu cost" note="Per-meal cost and total cost by menu item">
      <Table head={["Meal group","FG / menu","#Meal qty","#BOM material / meal","#Direct exp. / meal","#FG cost / meal","#Total cost"]} empty={!p.fg.length && <Empty title="No meal demand for this selection">Enter quantities on the Meal demand page.</Empty>}>
        {p.fg.map(x => <tr key={x.code}><td>{x.group}</td><td>{x.name}{x.gaps ? <span className="pos"> · incomplete</span> : ""}</td><td className="r">{fmt(x.qty, 0)}</td><td className="r">{inr(x.matPerMeal)}</td><td className="r">{inr(x.directPerMeal)}</td><td className="r">{inr(x.costPerMeal)}</td><td className="r">{inr(x.total)}</td></tr>)}</Table></Section>
    <Section eyebrow="INGREDIENT CONTROL" title="Ideal vs actual consumption" note="Actual = opening + purchases − closing.">
      <Table head={["Material","UOM",...groups.map(g => "#" + g),"#Ideal total","#Actual","#Qty variance","#Value variance"]} empty={!c.rows.length && <Empty title="Nothing to compare yet">Ideal quantities appear once demand and recipes exist; actuals come from the Consumption page.</Empty>}>
        {c.rows.map(r => <tr key={r.code}><td>{r.name}</td><td>{r.unit}</td>{groups.map(g => <td key={g} className="r">{fmt(r.byGroup[g] || 0)}</td>)}<td className="r"><b>{fmt(r.idealQty)}</b></td><td className="r">{fmt(r.actualQty)}</td><td className={"r " + (r.varQty > 0 ? "pos" : r.varQty < 0 ? "neg" : "")}>{fmt(r.varQty)}</td><td className={"r " + (r.varValue > 0 ? "pos" : r.varValue < 0 ? "neg" : "")}>{inr(r.varValue)}</td></tr>)}</Table></Section>
  </Shell>;
}
