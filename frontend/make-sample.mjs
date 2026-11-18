import * as XLSX from "xlsx";

const rows = [];
const diplomas = ["Licence Informatique", "Master IDAI", "Licence Mathématiques"];
const grades = ["Passable", "Assez Bien", "Bien", "Très Bien"];
const names = [
  "Amina Benali", "Youssef El Idrissi", "Salma Touzani", "Omar Alaoui",
  "Khadija Bennani", "Mehdi Chraibi", "Imane Fassi", "Hamza Lahlou",
  "Sara Mansouri", "Anas Berrada", "Nadia Tazi", "Reda Skalli",
];

names.forEach((name, i) => {
  rows.push({
    studentName: name,
    studentId: `2023-INF-${String(i + 1).padStart(3, "0")}`,
    diplomaTitle: diplomas[i % diplomas.length],
    issueDate: "2026-06-15",
    recipientAddress: "",
    grade: grades[i % grades.length],
  });
});

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Etudiants");
XLSX.writeFile(wb, "etudiants.xlsx");
console.log("etudiants.xlsx créé avec", rows.length, "lignes");