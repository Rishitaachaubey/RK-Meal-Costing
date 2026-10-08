"use client";
import { useEffect, useState, useCallback } from "react";

export function useDb() {
  const [db, setDb] = useState(null);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/db");
      const j = await r.json();

      // Ensure default Howrah kitchen if missing
      if (j && (!j.kitchens || j.kitchens.length === 0)) {
        j.kitchens = [{ id: "k-howrah", code: "HWH", name: "Howrah", zone: "East", active: true }];
      }

      setDb(j);
    } catch (e) {
      setErr("Failed to load data");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const act = async body => {
    try {
      const r = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await r.json();

      if (!r.ok) {
        setErr(j.error || "Action failed");
        return false;
      }

      if (j && (!j.kitchens || j.kitchens.length === 0)) {
        j.kitchens = [{ id: "k-howrah", code: "HWH", name: "Howrah", zone: "East", active: true }];
      }

      setErr("");
      setDb(j);
      return true;
    } catch (e) {
      setErr(e.message || "Network error");
      return false;
    }
  };

  const write = (table, row, op = "upsert", rows) => act({ table, row, rows, op });

  return { db, reload, write, act, setDb, err, setErr };
}
