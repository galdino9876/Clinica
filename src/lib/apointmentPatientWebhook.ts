const APPOINTMENT_PATIENT_URL =
  "https://webhook.essenciasaudeintegrada.com.br/webhook/apointment_patient";

export type PatientAppointmentRow = Record<string, unknown>;

function normalizeAppointmentRows(raw: unknown): PatientAppointmentRow[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (a) =>
        a &&
        typeof a === "object" &&
        Object.keys(a as object).length > 0 &&
        (a as PatientAppointmentRow).date
    ) as PatientAppointmentRow[];
  }
  if (typeof raw === "object" && raw !== null && "data" in (raw as object)) {
    return normalizeAppointmentRows((raw as { data: unknown }).data);
  }
  return [];
}

function sortByDateDesc(rows: PatientAppointmentRow[]): PatientAppointmentRow[] {
  return [...rows].sort((a, b) => {
    const dateA = new Date(String(a.date));
    const dateB = new Date(String(b.date));
    return dateB.getTime() - dateA.getTime();
  });
}

function rowPatientId(row: PatientAppointmentRow): number | null {
  const v =
    row.patient_id ??
    row.patientId ??
    row.Id_patient ??
    row.id_patient ??
    row.idPatient;
  if (v != null && v !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  const patient = row.patient;
  if (patient && typeof patient === "object") {
    const p = patient as Record<string, unknown>;
    const pv = p.id ?? p.patient_id ?? p.patientId;
    if (pv != null && pv !== "") {
      const n = Number(pv);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

async function fetchAppointmentPatientRaw(idCsv: string): Promise<unknown | null> {
  try {
    const response = await fetch(APPOINTMENT_PATIENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ id: idCsv }),
    });
    if (!response.ok) {
      console.error("apointment_patient:", response.status);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error("apointment_patient fetch error:", e);
    return null;
  }
}

/** Quando o lote devolve lista única sem patient_id, o front não consegue separar: 1 POST por paciente (comportamento antigo). */
async function fallbackPerPatientRequests(
  uniqueIds: number[]
): Promise<Map<number, PatientAppointmentRow[]>> {
  const map = new Map<number, PatientAppointmentRow[]>();
  uniqueIds.forEach((id) => map.set(id, []));

  await Promise.all(
    uniqueIds.map(async (pid) => {
      const data = await fetchAppointmentPatientRaw(String(pid));
      if (!Array.isArray(data)) return;
      map.set(pid, sortByDateDesc(normalizeAppointmentRows(data)));
    })
  );

  return map;
}

/**
 * Uma única requisição POST com body JSON `{ id: "89,90,92" }` (string com IDs separados por vírgula).
 * Evita que intermediários serializem array como ids[0], ids[1], etc.
 *
 * Formatos de resposta aceitos (n8n / backend):
 * 1) Lista plana: cada item com `date` e `patient_id` (recomendado para vários pacientes)
 * 2) Objeto com chaves numéricas: `{ "349": [...], "350": [...] }`
 * 3) `{ byPatientId: { "349": [...] } }` ou `{ patients: [{ id, appointments }] }`
 * 4) Lista plana sem `patient_id` quando só um id foi pedido (compatível com resposta atual de um paciente)
 *
 * Se forem vários ids e a API devolver uma lista misturada **sem** `patient_id` em cada linha,
 * o código aciona fallback: uma requisição `{ id: "89" }` por paciente (evita mapa vazio / erros).
 */
export async function fetchPatientAppointmentsBulk(
  patientIds: number[]
): Promise<Map<number, PatientAppointmentRow[]>> {
  const uniqueIds = [
    ...new Set(
      patientIds.filter((id) => id != null && Number.isFinite(Number(id))).map((id) => Number(id))
    ),
  ];

  const map = new Map<number, PatientAppointmentRow[]>();
  uniqueIds.forEach((id) => map.set(id, []));

  if (uniqueIds.length === 0) return map;

  const idCsv = uniqueIds.join(",");

  const data = await fetchAppointmentPatientRaw(idCsv);
  if (data == null) return map;

  if (Array.isArray(data)) {
    const rows = data as PatientAppointmentRow[];
    const withPid = rows.filter((r) => rowPatientId(r) != null);
    if (withPid.length > 0) {
      for (const row of rows) {
        const pid = rowPatientId(row);
        if (pid == null) continue;
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push(row);
      }
      for (const id of uniqueIds) {
        map.set(id, sortByDateDesc(map.get(id) ?? []));
      }
      return map;
    }

    if (uniqueIds.length === 1) {
      const id = uniqueIds[0];
      map.set(id, sortByDateDesc(normalizeAppointmentRows(data)));
      return map;
    }

    return await fallbackPerPatientRequests(uniqueIds);
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    const byPatientId = obj.byPatientId;
    if (byPatientId && typeof byPatientId === "object") {
      for (const k of Object.keys(byPatientId as object)) {
        const pid = Number(k);
        if (!Number.isFinite(pid)) continue;
        map.set(pid, sortByDateDesc(normalizeAppointmentRows((byPatientId as Record<string, unknown>)[k])));
      }
      return map;
    }

    const numericKeys = Object.keys(obj).filter((k) => /^\d+$/.test(k));
    if (
      numericKeys.length > 0 &&
      numericKeys.some((k) => Array.isArray(obj[k]))
    ) {
      for (const k of numericKeys) {
        const pid = Number(k);
        map.set(pid, sortByDateDesc(normalizeAppointmentRows(obj[k])));
      }
      return map;
    }

    const patients = obj.patients;
    if (Array.isArray(patients)) {
      for (const p of patients as Record<string, unknown>[]) {
        const pid = Number(p.id ?? p.patient_id ?? p.patientId);
        if (!Number.isFinite(pid)) continue;
        map.set(
          pid,
          sortByDateDesc(
            normalizeAppointmentRows(p.appointments ?? p.data ?? p.rows)
          )
        );
      }
      return map;
    }

    const list = obj.appointments ?? obj.data;
    if (Array.isArray(list)) {
      const rows = list as PatientAppointmentRow[];
      const withPid = rows.filter((r) => rowPatientId(r) != null);
      if (withPid.length > 0) {
        for (const row of rows) {
          const pid = rowPatientId(row);
          if (pid == null) continue;
          if (!map.has(pid)) map.set(pid, []);
          map.get(pid)!.push(row);
        }
        for (const id of uniqueIds) {
          map.set(id, sortByDateDesc(map.get(id) ?? []));
        }
        return map;
      }
      if (uniqueIds.length === 1) {
        map.set(uniqueIds[0], sortByDateDesc(normalizeAppointmentRows(list)));
        return map;
      }
    }
  }

  const allEmpty = uniqueIds.every((id) => (map.get(id)?.length ?? 0) === 0);
  if (uniqueIds.length > 1 && allEmpty) {
    const hasRows =
      (Array.isArray(data) && data.length > 0) ||
      (data &&
        typeof data === "object" &&
        Array.isArray((data as Record<string, unknown>).appointments) &&
        ((data as Record<string, unknown>).appointments as unknown[]).length > 0);
    if (hasRows) {
      console.warn(
        "apointment_patient: resposta em lote não permite mapear por paciente; usando uma requisição por id."
      );
      return await fallbackPerPatientRequests(uniqueIds);
    }
  }

  return map;
}

export async function fetchPatientAppointmentsForOne(
  patientId: number
): Promise<PatientAppointmentRow[]> {
  const m = await fetchPatientAppointmentsBulk([patientId]);
  return m.get(patientId) ?? [];
}
