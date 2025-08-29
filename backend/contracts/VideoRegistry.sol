// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VideoRegistry {
    struct Video {
        string ipfsHash;
        uint256 timestamp;
        uint256 fileSize;
        address owner;
        bool verified;
        string metadata;
    }
    
    mapping(bytes32 => Video) public videos;
    mapping(address => bytes32[]) public userVideos;
    mapping(address => bool) public verifiers;
    
    bytes32[] public allVideoIds;
    
    event VideoUploaded(bytes32 indexed videoId, string ipfsHash, address owner, uint256 timestamp);
    event VideoVerified(bytes32 indexed videoId, address verifier, bool verified);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Only verifiers can perform this action");
        _;
    }
    
    modifier onlyOwner(bytes32 videoId) {
        require(videos[videoId].owner == msg.sender, "Only video owner can perform this action");
        _;
    }
    
    constructor() {
        verifiers[msg.sender] = true; // Contract deployer is first verifier
    }
    
    function uploadVideo(
        string memory _ipfsHash, 
        uint256 _fileSize, 
        string memory _metadata
    ) public returns (bytes32) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_fileSize > 0, "File size must be greater than 0");
        
        bytes32 videoId = keccak256(abi.encodePacked(_ipfsHash, block.timestamp, msg.sender));
        
        require(videos[videoId].timestamp == 0, "Video already exists");
        
        videos[videoId] = Video({
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            fileSize: _fileSize,
            owner: msg.sender,
            verified: false,
            metadata: _metadata
        });
        
        userVideos[msg.sender].push(videoId);
        allVideoIds.push(videoId);
        
        emit VideoUploaded(videoId, _ipfsHash, msg.sender, block.timestamp);
        
        return videoId;
    }
    
    function verifyVideo(bytes32 videoId, bool _verified) public onlyVerifier {
        require(videos[videoId].timestamp != 0, "Video does not exist");
        
        videos[videoId].verified = _verified;
        
        emit VideoVerified(videoId, msg.sender, _verified);
    }
    
    function getVideo(bytes32 videoId) public view returns (Video memory) {
        return videos[videoId];
    }
    
    function getUserVideos(address user) public view returns (bytes32[] memory) {
        return userVideos[user];
    }
    
    function getAllVideos() public view returns (bytes32[] memory) {
        return allVideoIds;
    }
    
    function getVideoCount() public view returns (uint256) {
        return allVideoIds.length;
    }
    
    function addVerifier(address _verifier) public onlyVerifier {
        verifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }
    
    function removeVerifier(address _verifier) public onlyVerifier {
        require(_verifier != msg.sender, "Cannot remove yourself as verifier");
        verifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }
    
    function isVerifier(address _address) public view returns (bool) {
        return verifiers[_address];
    }
} 