// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CertificateRegistry
/// @notice Registre de certificats académiques vérifiables sur la blockchain
contract CertificateRegistry {
    // ---------- Données ----------

    struct Certificate {
        string studentName;
        string studentId;
        string diplomaTitle;
        string issueDate;
        string grade;
        address recipient;
        bool revoked;
    }

    address public owner;
    uint256 public totalCertificates;

    mapping(address => bool) public admins;
    mapping(uint256 => Certificate) private certificates;
    mapping(bytes32 => bool) private studentIdUsed;

    // ---------- Événements ----------

    event CertificateMinted(
        uint256 indexed certId,
        string studentId,
        address indexed recipient
    );
    event CertificateRevoked(uint256 indexed certId);
    event AdminUpdated(address indexed admin, bool isAdmin);

    // ---------- Contrôle d'accès ----------

    modifier onlyOwner() {
        require(msg.sender == owner, "Seul le owner peut faire ceci");
        _;
    }

    modifier onlyAdmin() {
        require(
            msg.sender == owner || admins[msg.sender],
            "Compte non autorise"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAdmin(address admin, bool isAdmin) external onlyOwner {
        admins[admin] = isAdmin;
        emit AdminUpdated(admin, isAdmin);
    }

    // ---------- Émission ----------

    function mintCertificate(
        address to,
        string calldata studentName,
        string calldata studentId,
        string calldata diplomaTitle,
        string calldata issueDate,
        string calldata grade
    ) external onlyAdmin returns (uint256 certId) {
        certId = _mint(to, studentName, studentId, diplomaTitle, issueDate, grade);
    }

    function batchMint(
        address[] calldata recipients,
        string[] calldata studentNames,
        string[] calldata studentIds,
        string[] calldata diplomaTitles,
        string[] calldata issueDates,
        string[] calldata grades
    ) external onlyAdmin {
        uint256 n = recipients.length;
        require(
            studentNames.length == n &&
                studentIds.length == n &&
                diplomaTitles.length == n &&
                issueDates.length == n &&
                grades.length == n,
            "Tableaux de tailles differentes"
        );
        require(n > 0, "Lot vide");

        for (uint256 i = 0; i < n; i++) {
            _mint(
                recipients[i],
                studentNames[i],
                studentIds[i],
                diplomaTitles[i],
                issueDates[i],
                grades[i]
            );
        }
    }

    function _mint(
        address to,
        string calldata studentName,
        string calldata studentId,
        string calldata diplomaTitle,
        string calldata issueDate,
        string calldata grade
    ) internal returns (uint256 certId) {
        require(bytes(studentId).length > 0, "studentId vide");
        require(bytes(studentName).length > 0, "studentName vide");

        bytes32 idHash = keccak256(bytes(studentId));
        require(!studentIdUsed[idHash], "studentId deja enregistre");
        studentIdUsed[idHash] = true;

        totalCertificates++;
        certId = totalCertificates;

        certificates[certId] = Certificate({
            studentName: studentName,
            studentId: studentId,
            diplomaTitle: diplomaTitle,
            issueDate: issueDate,
            grade: grade,
            recipient: to,
            revoked: false
        });

        emit CertificateMinted(certId, studentId, to);
    }

    // ---------- Révocation (optionnel) ----------

    function revoke(uint256 certId) external onlyAdmin {
        require(exists(certId), "Certificat inexistant");
        require(!certificates[certId].revoked, "Deja revoque");
        certificates[certId].revoked = true;
        emit CertificateRevoked(certId);
    }

    // ---------- Lecture (gratuite) ----------

    function exists(uint256 certId) public view returns (bool) {
        return certId > 0 && certId <= totalCertificates;
    }

    function getCertificate(
        uint256 certId
    ) external view returns (Certificate memory) {
        require(exists(certId), "Certificat inexistant");
        return certificates[certId];
    }

    function isStudentRegistered(
        string calldata studentId
    ) external view returns (bool) {
        return studentIdUsed[keccak256(bytes(studentId))];
    }
}