import { parseAbi } from "viem";

export const CONTRACT_ADDRESS = "0xa2114737892452a9a4c1DA57db3652f8b4D40D2c";

export const CONTRACT_ABI = parseAbi([
  "struct Certificate { string studentName; string studentId; string diplomaTitle; string issueDate; string grade; address recipient; bool revoked; }",
  "function owner() view returns (address)",
  "function totalCertificates() view returns (uint256)",
  "function exists(uint256 certId) view returns (bool)",
   "function getCertificate(uint256 certId) view returns (Certificate)",
  "function isStudentRegistered(string studentId) view returns (bool)",
  "function mintCertificate(address to, string studentName, string studentId, string diplomaTitle, string issueDate, string grade) returns (uint256)",
  "function batchMint(address[] recipients, string[] studentNames, string[] studentIds, string[] diplomaTitles, string[] issueDates, string[] grades)",
  "function revoke(uint256 certId)",
]);