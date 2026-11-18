import * as XLSX from "xlsx";
import { isAddress } from "viem";

const REQUIRED_COLUMNS = ["studentName", "studentId", "diplomaTitle", "issueDate"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Excel stocke parfois les dates comme des objets Date : on les remet en AAAA-MM-JJ
function normalizeDate(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value ?? "").trim();
}

function isRealDate(str) {
  if (!ISO_DATE.test(str)) return false;
  const [y, m, d] = str.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export async function parseFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (raw.length === 0) {
    throw new Error("Le fichier est vide.");
  }

  const columns = Object.keys(raw[0]);
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missing.length > 0) {
    throw new Error(`Colonnes manquantes : ${missing.join(", ")}`);
  }

  // Normalisation
  const rows = raw.map((r, index) => ({
    line: index + 2, // ligne dans Excel (la ligne 1 est l'en-tête)
    studentName: String(r.studentName ?? "").trim(),
    studentId: String(r.studentId ?? "").trim(),
    diplomaTitle: String(r.diplomaTitle ?? "").trim(),
    issueDate: normalizeDate(r.issueDate),
    recipientAddress: String(r.recipientAddress ?? "").trim(),
    grade: String(r.grade ?? "").trim(),
  }));

  // Compter les CNE pour repérer les doublons dans le fichier
  const counts = {};
  rows.forEach((r) => {
    if (r.studentId) counts[r.studentId] = (counts[r.studentId] || 0) + 1;
  });

  // Validation
  return rows.map((r) => {
    const errors = [];
    if (!r.studentName) errors.push("Nom vide");
    if (!r.studentId) errors.push("CNE vide");
    if (!r.diplomaTitle) errors.push("Diplôme vide");
    if (!isRealDate(r.issueDate)) errors.push("Date invalide (AAAA-MM-JJ)");
    if (r.recipientAddress && !isAddress(r.recipientAddress)) {
      errors.push("Adresse invalide");
    }
    if (r.studentId && counts[r.studentId] > 1) {
      errors.push("CNE en double dans le fichier");
    }
    return { ...r, errors, valid: errors.length === 0 };
  });
}