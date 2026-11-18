import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contract";

export default function RevokeForm() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [certId, setCertId] = useState("");
  const [msg, setMsg] = useState({ text: "", ok: false });
  const [busy, setBusy] = useState(false);

  if (!isConnected) return null;

  const handleRevoke = async (e) => {
    e.preventDefault();
    setMsg({ text: "", ok: false });
    if (!/^\d+$/.test(certId.trim()) || certId.trim() === "0") {
      return setMsg({ text: "Identifiant invalide.", ok: false });
    }

    const request = {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "revoke",
      args: [BigInt(certId.trim())],
    };

    setBusy(true);
    try {
      await publicClient.simulateContract({ ...request, account: address });
      const hash = await writeContractAsync(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setMsg(
        receipt.status === "success"
          ? { text: `Certificat ${certId} révoqué. Hash : ${hash}`, ok: true }
          : { text: "Transaction refusée par le contrat.", ok: false }
      );
    } catch (err) {
      setMsg({ text: err.shortMessage || err.message, ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Révoquer un certificat</h2>
      <form onSubmit={handleRevoke} style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Identifiant du certificat"
          value={certId}
          onChange={(e) => setCertId(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? "En cours..." : "Révoquer"}
        </button>
      </form>
      {msg.text && (
        <p style={{ color: msg.ok ? "green" : "crimson", wordBreak: "break-all" }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}