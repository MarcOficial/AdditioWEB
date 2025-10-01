import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/*
  AdditioClone_Enhanced.jsx
  ---------------------------------
  Versión mejorada del clon:
  - Promedios automáticos (por alumno y por clase)
  - Rúbricas (criterios con pesos) y cálculo ponderado
  - Gráficas con Recharts (asistencia y distribución de notas)
  - Guardado en localStorage
  - Exportar CSV

  Dependencias: react, recharts, tailwindcss (opcional para estilos)
  Instalar:
    npm install recharts

  Instrucciones breves:
    - Copia este archivo en src/AdditioClone_Enhanced.jsx
    - En App.jsx importa y usa el componente por defecto
    - Asegúrate de tener Tailwind o ajusta clases CSS
*/

export default function AdditioCloneEnhanced() {
  const students = [
    "JUAN MANUEL CHAVARRIAGA ESCALANTE",
    "RAYANE FATAH",
    "NOLAN JUSTO FLORES KUPIS",
    "ERIK HERMOSÍN REYES",
    "IKER HURTADO PLAZA",
    "LEV OBORIN",
    "IZAN OLLER VALLES",
    "JUAN LUIS TAPIA QUETGLAS",
    "JUAN ANDRES UBIÑA FERRAGUT",
    "MOISÉS VALLESPIR MOLINERA",
    "MARIO VIETE BARBER",
  ];

  const classes = [
    "COMUNICACIÓ I SOCIETAT 1",
    "Equips Elèctrics i Electrònics",
    "Muntatge i Manteniment d'Equips Informàtics 25/26",
    "CIÈNCIES APLICADES I INFORMÀTICA",
  ];

  // Structures
  // attendance[class][student] = boolean
  // grades[class][student] = { raw: {assessmentId: score}, final: number }
  // rubrics[class] = [{ id, name, weight }]

  const [selectedClass, setSelectedClass] = useState(classes[0]);
  const [attendance, setAttendance] = useState(() => {
    const base = {};
    classes.forEach((c) => {
      base[c] = {};
      students.forEach((s) => (base[c][s] = true));
    });
    return base;
  });

  const [grades, setGrades] = useState(() => {
    const base = {};
    classes.forEach((c) => {
      base[c] = {};
      students.forEach((s) => (base[c][s] = { raw: {}, final: null }));
    });
    return base;
  });

  const [rubrics, setRubrics] = useState(() => {
    const base = {};
    classes.forEach((c) => {
      // default simple rubric: single criterion 100%
      base[c] = [
        { id: "r1", name: "Global", weight: 100 },
      ];
    });
    return base;
  });

  const [search, setSearch] = useState("");

  // Persist/load
  useEffect(() => {
    const key = "additio_enhanced_v1";
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.attendance) setAttendance(parsed.attendance);
        if (parsed.grades) setGrades(parsed.grades);
        if (parsed.rubrics) setRubrics(parsed.rubrics);
      } catch (e) {
        console.warn("Error parsing storage", e);
      }
    }
  }, []);

  useEffect(() => {
    const key = "additio_enhanced_v1";
    localStorage.setItem(key, JSON.stringify({ attendance, grades, rubrics }));
  }, [attendance, grades, rubrics]);

  // Helpers
  function toggleAttendance(student) {
    setAttendance((prev) => ({
      ...prev,
      [selectedClass]: {
        ...prev[selectedClass],
        [student]: !prev[selectedClass][student],
      },
    }));
  }

  function setAssessmentScore(student, assessmentId, value) {
    setGrades((prev) => {
      const next = { ...prev };
      const record = { ...next[selectedClass][student] };
      const raw = { ...record.raw };
      if (value === "") delete raw[assessmentId];
      else raw[assessmentId] = Number(value);
      // recalc final
      const rubric = rubrics[selectedClass] || [];
      // assume assessments map 1:1 to rubric items by id
      let final = null;
      if (rubric.length > 0) {
        let sum = 0;
        let weightSum = 0;
        for (const r of rubric) {
          const score = raw[r.id] ?? null;
          if (score !== null) {
            sum += score * (r.weight / 100);
            weightSum += r.weight;
          }
        }
        // If some weights are missing because assessments not entered yet,
        // we still compute proportional final using weightSum (if >0).
        if (weightSum > 0) {
          final = sum; // already weighted
        } else {
          final = null;
        }
      }
      next[selectedClass] = { ...next[selectedClass], [student]: { raw, final } };
      return next;
    });
  }

  function addRubricCriterion(name, weight) {
    setRubrics((prev) => {
      const next = { ...prev };
      const list = [...(next[selectedClass] || [])];
      const id = `r${Date.now()}`;
      list.push({ id, name, weight: Number(weight) });
      next[selectedClass] = list;
      // When rubric changes, reset raw keys for grades to avoid mismatch
      setGrades((gprev) => {
        const gnext = { ...gprev };
        students.forEach((s) => {
          const cur = { ...gnext[selectedClass][s] };
          cur.raw = { ...cur.raw };
          // initialize new assessment to null (not present)
          // We don't set explicit key; user will enter scores mapped to r.id
          gnext[selectedClass][s] = cur;
        });
        return gnext;
      });
      return next;
    });
  }

  function updateRubricWeight(rubricId, newWeight) {
    setRubrics((prev) => {
      const next = { ...prev };
      next[selectedClass] = next[selectedClass].map((r) => (r.id === rubricId ? { ...r, weight: Number(newWeight) } : r));
      return next;
    });
  }

  function removeRubricCriterion(rubricId) {
    setRubrics((prev) => {
      const next = { ...prev };
      next[selectedClass] = next[selectedClass].filter((r) => r.id !== rubricId);
      return next;
    });
  }

  // Compute stats
  function classAverage(c) {
    const rec = grades[c];
    if (!rec) return null;
    const vals = students.map((s) => rec[s]?.final).filter((v) => v !== null && v !== undefined);
    if (vals.length === 0) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Number((sum / vals.length).toFixed(2));
  }

  function studentAverageInClass(c, s) {
    const val = grades[c]?.[s]?.final;
    return val === null ? null : Number(val);
  }

  // Charts data
  const attendanceData = classes.map((c) => {
    const presentCount = students.filter((s) => attendance[c]?.[s]).length;
    const total = students.length;
    return { name: c, present: presentCount, absent: total - presentCount };
  });

  const gradeHistogram = (() => {
    const arr = [];
    students.forEach((s) => {
      const v = grades[selectedClass]?.[s]?.final;
      if (v !== null && v !== undefined) arr.push(v);
    });
    // buckets 0-2,2-4,4-6,6-8,8-10
    const buckets = [0, 0, 0, 0, 0];
    arr.forEach((v) => {
      if (v < 2) buckets[0]++;
      else if (v < 4) buckets[1]++;
      else if (v < 6) buckets[2]++;
      else if (v < 8) buckets[3]++;
      else buckets[4]++;
    });
    return [
      { range: "0-2", count: buckets[0] },
      { range: "2-4", count: buckets[1] },
      { range: "4-6", count: buckets[2] },
      { range: "6-8", count: buckets[3] },
      { range: "8-10", count: buckets[4] },
    ];
  })();

  // CSV Export
  function exportCSV() {
    const rows = [];
    const header = ["Class", "Student", "Present", "Final"];
    rows.push(header.join(","));
    classes.forEach((c) => {
      students.forEach((s) => {
        const present = attendance[c] && attendance[c][s] ? "1" : "0";
        const final = grades[c] && grades[c][s] && grades[c][s].final !== null ? grades[c][s].final : "";
        rows.push([`"${c}"`, `"${s}"`, present, final].join(","));
      });
    });
    const csv = rows.join("
");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `additio_clone_enhanced_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // UI
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Additio — Clon Mejorado</h1>
            <p className="text-sm text-gray-600">Promedios, rúbricas y gráficas (guardado local)</p>
          </div>
          <div className="space-x-2">
            <button onClick={exportCSV} className="px-3 py-1 rounded bg-indigo-600 text-white">Exportar CSV</button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="lg:col-span-1 bg-white p-4 rounded shadow-sm">
            <h2 className="font-medium mb-2">Clases</h2>
            <ul className="space-y-2">
              {classes.map((c) => (
                <li key={c}>
                  <button
                    className={`w-full text-left px-3 py-2 rounded ${c === selectedClass ? "bg-indigo-100" : "hover:bg-gray-100"}`}
                    onClick={() => setSelectedClass(c)}
                  >
                    {c} {classAverage(c) !== null && <span className="text-sm text-gray-500"> — Prom: {classAverage(c)}</span>}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <h3 className="font-medium">Rúbrica de la clase</h3>
              <div className="mt-2 space-y-2">
                {(rubrics[selectedClass] || []).map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <input value={r.name} onChange={(e) => {
                      const name = e.target.value;
                      setRubrics(prev => {
                        const next = { ...prev };
                        next[selectedClass] = next[selectedClass].map(rr => rr.id === r.id ? { ...rr, name } : rr);
                        return next;
                      });
                    }} className="flex-1 border rounded px-2 py-1" />
                    <input type="number" min="0" max="100" value={r.weight} onChange={(e) => updateRubricWeight(r.id, e.target.value)} className="w-20 border rounded px-2 py-1" />
                    <button onClick={() => removeRubricCriterion(r.id)} className="px-2 py-1 border rounded">Eliminar</button>
                  </div>
                ))}

                <AddRubricForm onAdd={(name, weight) => addRubricCriterion(name, weight)} />

                <div className="text-sm text-gray-600 mt-2">Suma de pesos: {(rubrics[selectedClass] || []).reduce((a,b)=>a+b.weight,0)}%</div>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-medium">Buscar alumno</h3>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre..." className="mt-2 w-full border rounded px-2 py-1" />
            </div>

          </aside>

          <section className="lg:col-span-2 bg-white p-4 rounded shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Alumnos — {selectedClass}</h2>
              <div className="text-sm text-gray-600">Total: {students.filter(s => s.toLowerCase().includes(search.toLowerCase())).length}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left text-sm text-gray-700 border-b">
                    <th className="py-2">Alumno</th>
                    <th className="py-2">Presente</th>
                    {(rubrics[selectedClass] || []).map(r => (<th key={r.id} className="py-2">{r.name} ({r.weight}%)</th>))}
                    <th className="py-2">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => s.toLowerCase().includes(search.toLowerCase())).map((s) => (
                    <tr key={s} className="border-b hover:bg-gray-50">
                      <td className="py-2">{s}</td>
                      <td className="py-2">
                        <label className="inline-flex items-center">
                          <input type="checkbox" checked={attendance[selectedClass]?.[s] ?? true} onChange={() => toggleAttendance(s)} className="form-checkbox h-5 w-5" />
                        </label>
                      </td>
                      {(rubrics[selectedClass] || []).map(r => (
                        <td key={r.id} className="py-2">
                          <input type="number" min="0" max="10" step="0.1" value={grades[selectedClass]?.[s]?.raw[r.id] ?? ""} onChange={(e) => setAssessmentScore(s, r.id, e.target.value)} className="w-20 border rounded px-2 py-1" />
                        </td>
                      ))}
                      <td className="py-2">{grades[selectedClass]?.[s]?.final ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded shadow-sm">
                <h3 className="font-medium mb-2">Asistencia (todas las clases)</h3>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={attendanceData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" stackId="a" />
                      <Bar dataKey="absent" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow-sm">
                <h3 className="font-medium mb-2">Distribución de notas ({selectedClass})</h3>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={gradeHistogram}>
                      <XAxis dataKey="range" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </section>
        </main>

        <footer className="mt-6 text-sm text-gray-500">Versión mejorada: promedios, rúbricas y gráficas. Para avanzar a multiusuario necesitas backend (Firebase/Supabase).</footer>
      </div>
    </div>
  );
}

function AddRubricForm({ onAdd }) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState(100);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!name) return; onAdd(name, weight); setName(""); setWeight(100); }} className="flex gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo criterio" className="flex-1 border rounded px-2 py-1" />
      <input type="number" min="0" max="100" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
      <button className="px-3 py-1 border rounded">Añadir</button>
    </form>
  );
}
