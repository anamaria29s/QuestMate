import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import './Profile.css';

const Profile = () => {
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    const [profile, setProfile] = useState({});
    const [friendUsername, setFriendUsername] = useState("");
    const [message, setMessage] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showFriends, setShowFriends] = useState(false);
    const [friendRequests, setFriendRequests] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/profile/${username}/`)
            .then(response => setProfile(response.data))
            .catch(() => setProfile({}));
        
        fetchFriendRequests();
    }, [username]);

    const fetchFriendRequests = () => {
        axios.get("http://127.0.0.1:8000/api/friend-requests/", {
            headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
        })
        .then(response => setFriendRequests(response.data.pending_requests))
        .catch(error => console.error("Error fetching friend requests:", error));
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setFriendUsername(query);

        if (query) {
            axios.get("http://127.0.0.1:8000/api/users/search/", { params: { username: query } })
                .then(response => setSearchResults(response.data))
                .catch(error => console.error("Error searching users:", error));
        } else {
            setSearchResults([]);
        }
    };

    const handleAddFriend = (friendUsername) => {
        axios.post("http://127.0.0.1:8000/api/send-friend-request/", { receiver_username: friendUsername }, {
            headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
        })
        .then(response => {
            setMessage(response.data.message);
            setFriendUsername("");
            setSearchResults([]);
        })
        .catch(() => setMessage("Error sending friend request."));
    };

    const handleAcceptRequest = (senderUsername) => {
        axios.post("http://127.0.0.1:8000/api/accept-friend-request/", { sender_username: senderUsername }, {
            headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
        })
        .then(() => {
            setFriendRequests(friendRequests.filter(req => req.sender !== senderUsername));

            
        })
        .catch(() => setMessage("Error accepting request."));
    };

    const handleRejectRequest = (senderUsername) => {
        axios.post("http://127.0.0.1:8000/api/reject-friend-request/", { sender_username: senderUsername }, {
            headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
        })
        .then(() => {
            setFriendRequests(friendRequests.filter(req => req.sender !== senderUsername));
        })
        .catch(() => setMessage("Error rejecting request."));
    };

    const handleRemoveFriend = (friendUsername) => {
        axios.delete("http://127.0.0.1:8000/api/remove-friend/", {
            data: { friend_username: friendUsername },
            headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
        })
        .then(() => {
            setProfile(prevProfile => ({
                ...prevProfile,
                friends: prevProfile.friends.filter(friend => friend !== friendUsername)
            }));
            setMessage("Friend removed successfully.");
        })
        .catch(() => setMessage("Error removing friend."));
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                {profile && profile.profile_picture && <img src={`http://127.0.0.1:8000/media/${profile.profile_picture}`} alt="Profile" className="profile-image" />}
                <h2>{profile.username ? `${profile.username}'s Profile` : "Loading Profile..."}</h2>
            </div>
            <p><strong>Email:</strong> {email ? email : "No email provided"}</p>
            <p><strong>Bio:</strong> {profile.bio}</p>
            <p><strong>Birth Date:</strong> {profile.birth_date}</p>

            <h3 onClick={() => setShowFriends(prev => !prev)} style={{ cursor: "pointer", color: "#007BFF" }}>
                {showFriends ? "Hide Friends List" : "Show Friends List"}
            </h3>

            {showFriends && (
                <ul>
                    {profile.friends && profile.friends.length > 0 ? (
                        profile.friends.map((friend, index) => (
                            <li key={index}>
                                {friend} 
                                <button onClick={() => handleRemoveFriend(friend)} style={{ marginLeft: "10px", color: "red" }}>Remove</button>
                            </li>
                        ))
                    ) : (
                        <p>No friends yet.</p>
                    )}
                </ul>
            )}

            <h3>Friend Requests</h3>
            <ul>
                {friendRequests.length > 0 ? (
                    friendRequests.map((request, index) => (
                        <li key={index}>
                            {request.sender}
                            <button onClick={() => handleAcceptRequest(request.sender)}>Accept</button>
                            <button onClick={() => handleRejectRequest(request.sender)}>Reject</button>
                        </li>
                    ))
                ) : (
                    <p>No pending friend requests.</p>
                )}
            </ul>

            <h3>Add a Friend</h3>
            <input type="text" placeholder="Enter username" value={friendUsername} onChange={handleSearch} />
            <div className="search-results">
                {searchResults.length > 0 ? (
                    searchResults.map((result, index) => (
                        <div key={index} className="search-result-item">
                            <span>{result}</span>
                            <button onClick={() => handleAddFriend(result)}>Add</button>
                        </div>
                    ))
                ) : (
                    friendUsername && <p>No users found</p>
                )}
            </div>

            {message && <p>{message}</p>}

            <button onClick={() => navigate(`/profile/${username}/update`)}>Edit Profile</button>
        </div>
    );
};

export default Profile;
