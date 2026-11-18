import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";

const { ethers } = await network.connect();

// Données d'exemple réutilisables
const sample = (i) => ({
  name: `Etudiant ${i}`,
  studentId: `2023-INF-${String(i).padStart(3, "0")}`,
  diploma: "Licence Informatique",
  date: "2026-06-15",
  grade: "Mention Bien",
});

describe("CertificateRegistry", () => {
  let registry, owner, admin, outsider, student;

  beforeEach(async () => {
    [owner, admin, outsider, student] = await ethers.getSigners();
    registry = await ethers.deployContract("CertificateRegistry");
  });

  // ---------- Déploiement ----------

  it("définit le déployeur comme owner", async () => {
    assert.equal(await registry.owner(), owner.address);
  });

  // ---------- Mint unitaire ----------

  it("mint un certificat et le relit correctement", async () => {
    const s = sample(1);
    await registry.mintCertificate(
      student.address, s.name, s.studentId, s.diploma, s.date, s.grade
    );

    assert.equal(await registry.totalCertificates(), 1n);

    const cert = await registry.getCertificate(1);
    assert.equal(cert.studentName, s.name);
    assert.equal(cert.studentId, s.studentId);
    assert.equal(cert.diplomaTitle, s.diploma);
    assert.equal(cert.issueDate, s.date);
    assert.equal(cert.grade, s.grade);
    assert.equal(cert.recipient, student.address);
    assert.equal(cert.revoked, false);
  });

  it("émet l'event CertificateMinted", async () => {
    const s = sample(1);
    const tx = await registry.mintCertificate(
      student.address, s.name, s.studentId, s.diploma, s.date, s.grade
    );
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log) => registry.interface.parseLog(log))
      .find((e) => e && e.name === "CertificateMinted");

    assert.ok(event, "event CertificateMinted introuvable");
    assert.equal(event.args.certId, 1n);
    assert.equal(event.args.studentId, s.studentId);
    assert.equal(event.args.recipient, student.address);
  });

  // ---------- Sécurité ----------

  it("refuse le mint à un compte non autorisé", async () => {
    const s = sample(1);
    await assert.rejects(
      registry.connect(outsider).mintCertificate(
        student.address, s.name, s.studentId, s.diploma, s.date, s.grade
      ),
      /Compte non autorise/
    );
  });

  it("autorise un admin ajouté par le owner", async () => {
    await registry.setAdmin(admin.address, true);
    const s = sample(1);
    await registry.connect(admin).mintCertificate(
      student.address, s.name, s.studentId, s.diploma, s.date, s.grade
    );
    assert.equal(await registry.totalCertificates(), 1n);
  });

  it("refuse setAdmin à un non-owner", async () => {
    await assert.rejects(
      registry.connect(outsider).setAdmin(outsider.address, true),
      /Seul le owner/
    );
  });

  // ---------- Anti-doublon ----------

  it("refuse un studentId déjà enregistré", async () => {
    const s = sample(1);
    await registry.mintCertificate(
      student.address, s.name, s.studentId, s.diploma, s.date, s.grade
    );
    await assert.rejects(
      registry.mintCertificate(
        student.address, "Autre Nom", s.studentId, s.diploma, s.date, s.grade
      ),
      /deja enregistre/
    );
  });

  // ---------- Batch ----------

  it("batchMint crée plusieurs certificats", async () => {
    const list = [sample(1), sample(2), sample(3)];
    await registry.batchMint(
      list.map(() => student.address),
      list.map((s) => s.name),
      list.map((s) => s.studentId),
      list.map((s) => s.diploma),
      list.map((s) => s.date),
      list.map((s) => s.grade)
    );

    assert.equal(await registry.totalCertificates(), 3n);
    const cert2 = await registry.getCertificate(2);
    assert.equal(cert2.studentName, "Etudiant 2");
  });

  it("batchMint refuse des tableaux de tailles différentes", async () => {
    await assert.rejects(
      registry.batchMint(
        [student.address, student.address],
        ["A"],
        ["id1", "id2"],
        ["D", "D"],
        ["2026-01-01", "2026-01-01"],
        ["B", "B"]
      ),
      /tailles differentes/
    );
  });

  it("batchMint est annulé en entier si un doublon est présent", async () => {
    const list = [sample(1), sample(2), sample(1)]; // sample(1) deux fois
    await assert.rejects(
      registry.batchMint(
        list.map(() => student.address),
        list.map((s) => s.name),
        list.map((s) => s.studentId),
        list.map((s) => s.diploma),
        list.map((s) => s.date),
        list.map((s) => s.grade)
      ),
      /deja enregistre/
    );
    // rien ne doit avoir été enregistré
    assert.equal(await registry.totalCertificates(), 0n);
  });

  // ---------- Lecture ----------

  it("getCertificate échoue pour un id inexistant", async () => {
    await assert.rejects(registry.getCertificate(99), /inexistant/);
    await assert.rejects(registry.getCertificate(0), /inexistant/);
  });

  // ---------- Révocation ----------

  it("revoke marque le certificat comme révoqué", async () => {
    const s = sample(1);
    await registry.mintCertificate(
      student.address, s.name, s.studentId, s.diploma, s.date, s.grade
    );
    await registry.revoke(1);
    const cert = await registry.getCertificate(1);
    assert.equal(cert.revoked, true);
  });

  it("revoke refuse un non-autorisé", async () => {
    const s = sample(1);
    await registry.mintCertificate(
      student.address, s.name, s.studentId, s.diploma, s.date, s.grade
    );
    await assert.rejects(
      registry.connect(outsider).revoke(1),
      /Compte non autorise/
    );
  });
});