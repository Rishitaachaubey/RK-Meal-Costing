"use client";
import { useEffect, useState, useCallback } from "react";
export function useDb() {
  const [db, setDb] = useState(null); const [err, setErr] = useState("");
  const reload = useCallback(async () => setDb(await (await fetch("/api/db")).json()), []);
  useEffect(() => { reload(); }, [reload]);
  const act = async body => { const r = await fetch("/api/db", { method: "POST", body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) { setErr(j.error); return false; } setErr(""); setDb(j); return true; };
  const write = (table, row, op = "upsert", rows) => act({ table, row, rows, op });
  return { db, reload, write, act, setDb, err, setErr };
}
