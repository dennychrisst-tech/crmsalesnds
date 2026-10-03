"use client";
import { useState } from "react";
import { selectCls } from "./Modal";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface Parts { d: string; m: string; y: string }

function parse(value: string): Parts {
  if (!value) return { d: "", m: "", y: "" };
  const [y, m, d] = value.split("-");
  return { d: String(+d), m: String(+m), y };
}

interface Props {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  yearsBack?: number;
  yearsForward?: number;
  style?: React.CSSProperties;
}

/** Date picker made of Tanggal/Bulan/Tahun <select> dropdowns instead of the native calendar widget. */
export default function DateDropdown({ value, onChange, yearsBack = 5, yearsForward = 2, style }: Props) {
  const [parts, setParts] = useState<Parts>(() => parse(value));
  // Resync from the prop when it changes externally (e.g. switching to a
  // different activity being edited), without an effect — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setParts(parse(value));
  }

  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: yearsBack + yearsForward + 1 }, (_, i) => nowYear + yearsForward - i);
  const daysInMonth = parts.y && parts.m ? new Date(+parts.y, +parts.m, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function update(next: Partial<Parts>) {
    const merged = { ...parts, ...next };
    setParts(merged);
    if (merged.d && merged.m && merged.y) {
      const maxDay = new Date(+merged.y, +merged.m, 0).getDate();
      const d = Math.min(+merged.d, maxDay);
      onChange(`${merged.y}-${String(+merged.m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, ...style }}>
      <select className={selectCls} value={parts.d} onChange={e => update({ d: e.target.value })} style={{ flex: "0 0 64px" }}>
        <option value="">Tgl</option>
        {days.map(day => <option key={day} value={day}>{day}</option>)}
      </select>
      <select className={selectCls} value={parts.m} onChange={e => update({ m: e.target.value })} style={{ flex: "1 1 100px" }}>
        <option value="">Bulan</option>
        {MONTHS.map((mon, i) => <option key={mon} value={i + 1}>{mon}</option>)}
      </select>
      <select className={selectCls} value={parts.y} onChange={e => update({ y: e.target.value })} style={{ flex: "0 0 84px" }}>
        <option value="">Tahun</option>
        {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
      </select>
    </div>
  );
}
