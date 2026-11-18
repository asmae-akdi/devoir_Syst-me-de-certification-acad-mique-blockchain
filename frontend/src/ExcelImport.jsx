import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { zeroAddress } from "viem";
import { parseFile } from "./excel";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contract";

export default function ExcelImport() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const [batchSize, setBatchSize] = useState(10);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [emitError, setEmitError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setRows([]);
    setSelected(new Set());
    setResults([]);
    setSkipped([]);
    setEmitError("");
    setFileName(file.name);

    try {
      const parsed = await parseFile(file);
      setRows(parsed);
      setSelected(new Set(parsed.filter((r) => r.valid).map((r) => r.line)));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = (line) => {
    const next = new Set(selected);
    next.has(line) ? next.delete(line) : next.add(line);
    setSelected(next);
  };

  const validRows = rows.filter((r) => r.valid);
  const allValidSelected =
    validRows.length > 0 && validRows.every((r) => selected.has(r.line));

  const toggleAll = () => {
    setSelected(
      allValidSelected ? new Set() : new Set(validRows.map((r) => r.line))
    );
  };

  const handleEmit = async () => {
    setResults([]);
    setSkipped([]);
    setEmitError("");

    const toSend = rows.filter((r) => selected.has(r.line));
    if (toSend.length === 0) {
      return setEmitError("Aucune ligne sélectionnée.");
    }

    const size = Math.min(15, Math.max(1, Number(batchSize) || 10));
    setRunning(true);

    try {
      // 1. Écarter les CNE déjà enregistrés sur la blockchain
      const fresh = [];
      const already = [];
      for (const r of toSend) {
        const exists = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "isStudentRegistered",
          args: [r.studentId],
        });
        (exists ? already : fresh).push(r);
      }
      setSkipped(already);

      if (fresh.length === 0) {
        setEmitError("Tous les CNE sélectionnés sont déjà enregistrés.");
        return;
      }

      // 2. Découper en lots
      const chunks = [];
      for (let i = 0; i < fresh.length; i += size) {
        chunks.push(fresh.slice(i, i + size));
      }

      // 3. Envoyer les lots un par un (un résultat ajouté par lot)
      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c];
        const label = `Lot ${c + 1}/${chunks.length} (${chunk.length} certificats)`;

        const request = {
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "batchMint",
          args: [
            chunk.map((r) => r.recipientAddress || zeroAddress),
            chunk.map((r) => r.studentName),
            chunk.map((r) => r.studentId),
            chunk.map((r) => r.diplomaTitle),
            chunk.map((r) => r.issueDate),
            chunk.map((r) => r.grade),
          ],
        };

        try {
          // Simulation : erreur claire avant d'ouvrir MetaMask
          await publicClient.simulateContract({ ...request, account: address });

          const hash = await writeContractAsync(request);
          setResults((prev) => [
            ...prev,
            { label, hash, status: "En attente de confirmation..." },
          ]);

          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          const status =
            receipt.status === "success" ? "Confirmé" : "Refusé par le contrat";
          setResults((prev) =>
            prev.map((x, i) => (i === c ? { ...x, status } : x))
          );
          if (receipt.status !== "success") break;
        } catch (err) {
          setResults((prev) => [
            ...prev,
            { label, hash: null, status: "Erreur : " + (err.shortMessage || err.message) },
          ]);
          break; // on arrête les lots suivants
        }
      }
    } catch (err) {
      setEmitError(err.shortMessage || err.message);
    } finally {
      setRunning(false);
    }
  };

  const th = { border: "1px solid #ccc", padding: 6, textAlign: "left" };
  const td = { border: "1px solid #ccc", padding: 6 };

  return (
    <div>
      <h2>Import Excel / CSV</h2>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
      {fileName && <p>Fichier : {fileName}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {rows.length > 0 && (
        <>
          <p>
            {rows.length} lignes lues, {validRows.length} valides,{" "}
            {rows.length - validRows.length} en erreur.{" "}
            <strong>{selected.size} sélectionnée(s)</strong>
          </p>

          <table style={{ borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={th}>
                  <input type="checkbox" checked={allValidSelected} onChange={toggleAll} />
                </th>
                <th style={th}>Ligne</th>
                <th style={th}>Nom</th>
                <th style={th}>CNE</th>
                <th style={th}>Diplôme</th>
                <th style={th}>Date</th>
                <th style={th}>Mention</th>
                <th style={th}>Adresse</th>
                <th style={th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.line}
                  style={{
                    background: r.valid ? "transparent" : "#fde8e8",
                    color: r.valid ? "inherit" : "#7a1f1f",
                  }}
                >
                  <td style={td}>
                    <input
                      type="checkbox"
                      disabled={!r.valid}
                      checked={selected.has(r.line)}
                      onChange={() => toggle(r.line)}
                    />
                  </td>
                  <td style={td}>{r.line}</td>
                  <td style={td}>{r.studentName}</td>
                  <td style={td}>{r.studentId}</td>
                  <td style={td}>{r.diplomaTitle}</td>
                  <td style={td}>{r.issueDate}</td>
                  <td style={td}>{r.grade}</td>
                  <td style={td}>{r.recipientAddress || "-"}</td>
                  <td style={td}>{r.valid ? "OK" : r.errors.join(" ; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 16, display: "grid", gap: 8, maxWidth: 520 }}>
            <label>
              Taille des lots (1 à 15) :{" "}
              <input
                type="number"
                min={1}
                max={15}
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                style={{ width: 60 }}
              />
            </label>

            {!isConnected && (
              <p style={{ color: "crimson" }}>Connecte ton wallet pour émettre.</p>
            )}

            <button
              onClick={handleEmit}
              disabled={running || !isConnected || selected.size === 0}
            >
              {running
                ? "Émission en cours..."
                : `Émettre ${selected.size} certificat(s)`}
            </button>

            {emitError && <p style={{ color: "crimson" }}>{emitError}</p>}

            {skipped.length > 0 && (
              <div style={{ color: "#8a5a00" }}>
                <strong>{skipped.length} ligne(s) ignorée(s)</strong> (CNE déjà
                enregistré sur la blockchain) :
                <ul>
                  {skipped.map((r) => (
                    <li key={r.line}>
                      Ligne {r.line} : {r.studentId} ({r.studentName})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.map((r, i) => (
              <div key={i} style={{ border: "1px solid #ccc", padding: 8 }}>
                <strong>{r.label}</strong>
                <div
                  style={{
                    color: r.status === "Confirmé" ? "green" : r.status.startsWith("En attente") ? "inherit" : "crimson",
                  }}
                >
                  {r.status}
                </div>
                {r.hash && (
                  <div style={{ wordBreak: "break-all" }}>
                    Hash : <code>{r.hash}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
