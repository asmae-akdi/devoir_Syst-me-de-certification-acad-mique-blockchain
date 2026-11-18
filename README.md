# Système de certification académique sur blockchain

Registre de certificats académiques vérifiables : smart contract Solidity,
frontend React (zone administrateur + zone publique) et import Excel.

## Contrat déployé
- Réseau : Sepolia (testnet)
- Adresse : `0xa2114737892452a9a4c1DA57db3652f8b4D40D2c`
- Etherscan : https://sepolia.etherscan.io/address/0xa2114737892452a9a4c1DA57db3652f8b4D40D2c

## Stack
Hardhat 3 · Solidity 0.8.34 · React + Vite · wagmi/viem · SheetJS (xlsx)

## Prérequis
Node.js 22+ (testé avec 24) et l'extension MetaMask.

## Installation

### Contrat
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Ouvrir http://localhost:5173

## Déploiement

### En local
```bash
cd contracts
npx hardhat node
# dans un autre terminal :
npx hardhat ignition deploy ignition/modules/CertificateRegistry.js --network localhost
```

### Sur Sepolia
```bash
cd contracts
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat ignition deploy ignition/modules/CertificateRegistry.js --network sepolia
```
Les secrets sont stockés dans le keystore chiffré de Hardhat, jamais dans le dépôt.
Reporter ensuite l'adresse du contrat dans `frontend/src/contract.js`
et adapter le réseau dans `frontend/src/wagmi.js` et `App.jsx`.

## Utilisation

**Zone publique** (aucun wallet requis) : saisir l'identifiant d'un certificat
pour afficher ses informations et son statut (valide ou révoqué).

**Zone administrateur** (wallet owner ou admin) :
- mint unitaire via formulaire ;
- import d'un fichier .xlsx / .csv : aperçu, validation, sélection des lignes,
  émission par lots (taille réglable, 1 à 15) ;
- révocation d'un certificat.

## Format du fichier Excel
Colonnes : `studentName`, `studentId`, `diplomaTitle`, `issueDate` (AAAA-MM-JJ),
`recipientAddress` (optionnel), `grade`. Exemple : `frontend/etudiants.xlsx`.

## Choix de conception
- Contrôle d'accès : `owner` + mapping d'admins.
- Anti-doublon sur `studentId` (empreinte keccak256).
- `batchMint` atomique : si une ligne échoue, tout le lot est annulé.
- Le frontend écarte les CNE déjà enregistrés et simule chaque transaction
  avant l'envoi pour afficher des erreurs claires.
- Compilation avec `viaIR` pour éviter l'erreur « stack too deep ».

## Tests
13 tests Hardhat : mint, event, accès restreint, admins, anti-doublon, batch
(cas normal, tailles différentes, doublon), lecture, révocation.

## Limites connues
- Un étudiant ne peut avoir qu'un seul certificat (contrainte sur le studentId).
- Les données sont publiques sur la blockchain : ne pas y mettre d'informations
  sensibles.