import { useState } from "react";
import { usePublicClient } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contract";

export default function PublicVerify() {
  const publicClient = usePublicClient();
  const [certId, setCertId] = useState("");
  const [cert, setCert] = useState(null);
  const [searchedId, setSearchedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setCert(null);

    if (!/^\d+$/.test(certId.trim()) || certId.trim() === "0") {
      return setError("Entre un identifiant valide (nombre entier ≥ 1).");
    }

    const id = BigInt(certId.trim());
    setLoading(true);
    try {
      const found = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "exists",
        args: [id],
      });
      if (!found) {
        setError(`Aucun certificat avec l'identifiant ${id}.`);
        return;
      }

      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getCertificate",
        args: [id],
      });
      setCert(data);
      setSearchedId(id.toString());
    } catch (err) {
      setError(err.shortMessage || err.message);
    } finally {
      setLoading(false);
    }
  };

  const row = { display: "flex", gap: 8, padding: "4px 0" };
  const label = { width: 140, fontWeight: "bold" };

  return (
    <div>
      <h2>Vérifier un certificat</h2>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Identifiant du certificat (ex: 1)"
          value={certId}
          onChange={(e) => setCertId(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Recherche..." : "Vérifier"}
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {cert && (
        <div style={{ marginTop: 16, border: "1px solid #ccc", padding: 16, maxWidth: 520 }}>
          <div
            style={{
              padding: 8,
              marginBottom: 12,
              fontWeight: "bold",
              color: "white",
              background: cert.revoked ? "crimson" : "green",
            }}
          >
            {cert.revoked ? "❌ Certificat RÉVOQUÉ" : "✅ Certificat VALIDE"}
          </div>
          <div style={row}><span style={label}>N° certificat</span>{searchedId}</div>
          <div style={row}><span style={label}>Étudiant</span>{cert.studentName}</div>
          <div style={row}><span style={label}>CNE</span>{cert.studentId}</div>
          <div style={row}><span style={label}>Diplôme</span>{cert.diplomaTitle}</div>
          <div style={row}><span style={label}>Date d'émission</span>{cert.issueDate}</div>
          <div style={row}><span style={label}>Mention</span>{cert.grade || "-"}</div>
          <div style={{ ...row, wordBreak: "break-all" }}>
            <span style={label}>Destinataire</span>{cert.recipient}
          </div>
        </div>
      )}
    </div>
  );
}