// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BlockCam {
    struct Video {
        string hash;           // IPFS hash of the video
        string title;          // Video title
        string description;    // Video description
        uint256 duration;      // Video duration in seconds
        address uploader;      // Address of the uploader
        uint256 uploadTime;    // Timestamp when video was uploaded
        bool verified;         // Whether video is verified
        uint256 viewCount;     // Number of views
        uint256 likeCount;     // Number of likes
        string category;       // Video category
        string thumbnail;      // IPFS hash of thumbnail
    }
    
    // Mappings
    mapping(string => Video) public videos;           // hash => Video
    mapping(address => string[]) public userVideos;   // user => video hashes
    mapping(address => bool) public verifiers;        // verifier addresses
    mapping(string => bool) public videoExists;       // hash => exists
    
    // Arrays
    string[] public allVideoHashes;
    
    // Events
    event VideoUploaded(
        string indexed hash,
        string title,
        address indexed uploader,
        uint256 uploadTime
    );
    
    event VideoVerified(
        string indexed hash,
        address indexed verifier,
        bool verified
    );
    
    event VideoViewed(
        string indexed hash,
        address indexed viewer,
        uint256 viewCount
    );
    
    event VideoLiked(
        string indexed hash,
        address indexed liker,
        uint256 likeCount
    );
    
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
    // Modifiers
    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Only verifiers can perform this action");
        _;
    }
    
    modifier onlyUploader(string memory _hash) {
        require(videos[_hash].uploader == msg.sender, "Only video uploader can perform this action");
        _;
    }
    
    modifier videoExistsCheck(string memory _hash) {
        require(videoExists[_hash], "Video does not exist");
        _;
    }
    
    // Constructor
    constructor() {
        verifiers[msg.sender] = true; // Contract deployer is first verifier
    }
    
    // Core functions
    function uploadVideo(
        string memory _hash,
        string memory _title,
        string memory _description,
        uint256 _duration
    ) public returns (bool) {
        require(bytes(_hash).length > 0, "IPFS hash cannot be empty");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_duration > 0, "Duration must be greater than 0");
        require(!videoExists[_hash], "Video with this hash already exists");
        
        videos[_hash] = Video({
            hash: _hash,
            title: _title,
            description: _description,
            duration: _duration,
            uploader: msg.sender,
            uploadTime: block.timestamp,
            verified: false,
            viewCount: 0,
            likeCount: 0,
            category: "",
            thumbnail: ""
        });
        
        videoExists[_hash] = true;
        userVideos[msg.sender].push(_hash);
        allVideoHashes.push(_hash);
        
        emit VideoUploaded(_hash, _title, msg.sender, block.timestamp);
        
        return true;
    }
    
    function updateVideoMetadata(
        string memory _hash,
        string memory _title,
        string memory _description,
        string memory _category,
        string memory _thumbnail
    ) public onlyUploader(_hash) videoExistsCheck(_hash) {
        videos[_hash].title = _title;
        videos[_hash].description = _description;
        videos[_hash].category = _category;
        videos[_hash].thumbnail = _thumbnail;
    }
    
    function verifyVideo(string memory _hash, bool _verified) 
        public 
        onlyVerifier 
        videoExistsCheck(_hash) 
    {
        videos[_hash].verified = _verified;
        emit VideoVerified(_hash, msg.sender, _verified);
    }
    
    function viewVideo(string memory _hash) 
        public 
        videoExistsCheck(_hash) 
    {
        videos[_hash].viewCount++;
        emit VideoViewed(_hash, msg.sender, videos[_hash].viewCount);
    }
    
    function likeVideo(string memory _hash) 
        public 
        videoExistsCheck(_hash) 
    {
        videos[_hash].likeCount++;
        emit VideoLiked(_hash, msg.sender, videos[_hash].likeCount);
    }
    
    // Getter functions
    function getVideo(string memory _hash) 
        public 
        view 
        videoExistsCheck(_hash) 
        returns (Video memory) 
    {
        return videos[_hash];
    }
    
    function getUserVideos(address _user) public view returns (string[] memory) {
        return userVideos[_user];
    }
    
    function getAllVideos() public view returns (string[] memory) {
        return allVideoHashes;
    }
    
    function getVideoCount() public view returns (uint256) {
        return allVideoHashes.length;
    }
    
    function getVideosByCategory(string memory _category) public view returns (string[] memory) {
        uint256 count = 0;
        
        // Count videos in category
        for (uint256 i = 0; i < allVideoHashes.length; i++) {
            if (keccak256(bytes(videos[allVideoHashes[i]].category)) == keccak256(bytes(_category))) {
                count++;
            }
        }
        
        // Create array with correct size
        string[] memory categoryVideos = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allVideoHashes.length; i++) {
            if (keccak256(bytes(videos[allVideoHashes[i]].category)) == keccak256(bytes(_category))) {
                categoryVideos[index] = allVideoHashes[i];
                index++;
            }
        }
        
        return categoryVideos;
    }
    
    function getVerifiedVideos() public view returns (string[] memory) {
        uint256 count = 0;
        
        // Count verified videos
        for (uint256 i = 0; i < allVideoHashes.length; i++) {
            if (videos[allVideoHashes[i]].verified) {
                count++;
            }
        }
        
        // Create array with correct size
        string[] memory verifiedVideos = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allVideoHashes.length; i++) {
            if (videos[allVideoHashes[i]].verified) {
                verifiedVideos[index] = allVideoHashes[i];
                index++;
            }
        }
        
        return verifiedVideos;
    }
    
    // Verifier management
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
    
    // Statistics
    function getVideoStats(string memory _hash) 
        public 
        view 
        videoExistsCheck(_hash) 
        returns (uint256 viewCount, uint256 likeCount, bool verified) 
    {
        Video memory video = videos[_hash];
        return (video.viewCount, video.likeCount, video.verified);
    }
    
    function getTotalStats() public view returns (uint256 totalVideos, uint256 totalViews, uint256 totalLikes) {
        uint256 views = 0;
        uint256 likes = 0;
        
        for (uint256 i = 0; i < allVideoHashes.length; i++) {
            views += videos[allVideoHashes[i]].viewCount;
            likes += videos[allVideoHashes[i]].likeCount;
        }
        
        return (allVideoHashes.length, views, likes);
    }
} 