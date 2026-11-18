import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { isAddress, zeroAddress } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contract";
import ExcelImport from "./ExcelImport";
import PublicVerify from "./PublicVerify";
import RevokeForm from "./RevokeForm";

const emptyForm = {
  recipient: "",
  studentName: "",
  studentId: "",
  diplomaTitle: "",
  issueDate: "",
  grade: "",
};

function WalletBar() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button onClick={() => connect({ connector: connectors[0] })}>
        Connecter MetaMask
      </button>
    );
  }

  return (
    <div>
      <p>
        Connecté : <code>{address}</code>
      </p>
      {chainId !== sepolia.id && (
        <p style={{ color: "crimson" }}>
          Mauvais réseau.{" "}
          <button onClick={() => switchChain({ chainId: sepolia.id })}>
            Passer sur Sepolia
          </button>
        </p>
      )}
      <button onClick={() => disconnect()}>Déconnecter</button>
    </div>
  );
}

function MintForm() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "owner",
  });

  const { data: total, refetch: refetchTotal } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "totalCertificates",
  });

  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const { data: receipt, isLoading: isConfirming } =
    useWaitForTransactionReceipt({ hash });

  const isSuccess = receipt?.status === "success";
  const isReverted = receipt?.status === "reverted";

  useEffect(() => {
    if (isSuccess) refetchTotal();
  }, [isSuccess]);

  const update = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    reset();

    const { studentName, studentId, diplomaTitle, issueDate, grade } = form;
    if (!studentName.trim() || !studentId.trim() || !diplomaTitle.trim()) {
      return setFormError("Nom, CNE et diplôme sont obligatoires.");
    }
    if (form.recipient && !isAddress(form.recipient)) {
      return setFormError("Adresse du destinataire invalide.");
    }

    const request = {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "mintCertificate",
      args: [
        form.recipient || zeroAddress,
        studentName.trim(),
        studentId.trim(),
        diplomaTitle.trim(),
        issueDate,
        grade,
      ],
    };

    // Simulation : si le contrat va refuser, on l'affiche AVANT MetaMask
    try {
      await publicClient.simulateContract({ ...request, account: address });
    } catch (err) {
      return setFormError(err.shortMessage || err.message);
    }

    writeContract(request);
  };

  if (!isConnected) return <p>Connecte ton wallet pour émettre un certificat.</p>;

  const isOwner = owner && address?.toLowerCase() === owner.toLowerCase();

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
      <h2>Émettre un certificat</h2>
      <p>Certificats émis : {total?.toString() ?? "..."}</p>
      {!isOwner && (
        <p style={{ color: "crimson" }}>
          Ce compte n'est pas le owner : la transaction sera refusée.
        </p>
      )}

      <input name="studentName" placeholder="Nom de l'étudiant" value={form.studentName} onChange={update} />
      <input name="studentId" placeholder="CNE / identifiant (ex: 2023-INF-042)" value={form.studentId} onChange={update} />
      <input name="diplomaTitle" placeholder="Diplôme (ex: Licence Informatique)" value={form.diplomaTitle} onChange={update} />
      <input name="issueDate" type="date" value={form.issueDate} onChange={update} />
      <input name="grade" placeholder="Mention (ex: Mention Bien)" value={form.grade} onChange={update} />
      <input name="recipient" placeholder="Adresse wallet du destinataire (optionnel)" value={form.recipient} onChange={update} />

      <button type="submit" disabled={isPending || isConfirming}>
        {isPending ? "Signature dans MetaMask..." : isConfirming ? "Confirmation..." : "Émettre"}
      </button>

      {formError && <p style={{ color: "crimson" }}>{formError}</p>}
      {error && <p style={{ color: "crimson" }}>Erreur : {error.shortMessage || error.message}</p>}
      {isReverted && (
        <p style={{ color: "crimson" }}>
          Transaction refusée par le contrat. Hash : <code>{hash}</code>
        </p>
      )}
      {isSuccess && (
        <p style={{ color: "green" }}>
          Certificat émis ! Hash : <code>{hash}</code>
        </p>
      )}
    </form>
  );
}

export default function App() {
  const [tab, setTab] = useState("public");

  const tabStyle = (name) => ({
    padding: "8px 16px",
    marginRight: 8,
    cursor: "pointer",
    fontWeight: tab === name ? "bold" : "normal",
    borderBottom: tab === name ? "3px solid #646cff" : "3px solid transparent",
    background: "transparent",
    border: "none",
  });

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Certification académique</h1>

      <div style={{ marginBottom: 16 }}>
        <button style={tabStyle("public")} onClick={() => setTab("public")}>
          Zone publique
        </button>
        <button style={tabStyle("admin")} onClick={() => setTab("admin")}>
          Zone administrateur
        </button>
      </div>

      {tab === "public" && <PublicVerify />}

      {tab === "admin" && (
        <>
          <WalletBar />
          <hr />
          <MintForm />
          <hr />
          <ExcelImport />
          <hr />
          <RevokeForm />
        </>
      )}
    </div>
  );
}