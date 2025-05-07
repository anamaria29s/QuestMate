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
    const [achievements, setAchievements] = useState([]);
    const [showAchievements, setShowAchievements] = useState(false);
    const [loading, setLoading] = useState(false);
    const [achievementAlert, setAchievementAlert] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/profile/${username}/`)
            .then(response => setProfile(response.data))
            .catch(() => setProfile({}));
        
        fetchFriendRequests();
        fetchAchievements();

        // Check for new achievement notification in localStorage
        const newAchievement = localStorage.getItem('new_achievement');
        if (newAchievement) {
            setAchievementAlert(JSON.parse(newAchievement));
            // Remove after showing
            setTimeout(() => {
                localStorage.removeItem('new_achievement');
                setAchievementAlert(null);
            }, 5000);
        }
    }, [username]);

    const fetchAchievements = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                'http://127.0.0.1:8000/api/user/achievements/',
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                }
            );
            setAchievements(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching achievements:", err);
            setLoading(false);
        }
    };

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

    // Get user initial for avatar
    const getInitial = (name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    // Render achievement icon
    const renderAchievementIcon = (icon) => {
        const icons = {
            'trophy': '🏆',
            'star': '⭐',
            'award': '🏅',
            'sunrise': '🌅',
            'calendar': '📅',
            'check-circle': '✅',
            'trending-up': '📈',
            'activity': '📊',
            'zap': '⚡',
            'play': '▶️'
        };
        return icons[icon] || '🔶';
    };

    return (
        <div className="profile-page">
            {achievementAlert && (
                <div className="achievement-alert">
                    <div className="achievement-alert-icon">
                        {renderAchievementIcon(achievementAlert.icon)}
                    </div>
                    <div className="achievement-alert-content">
                        <h4>New Achievement Unlocked!</h4>
                        <p className="achievement-alert-name">{achievementAlert.name}</p>
                        <p className="achievement-alert-description">{achievementAlert.description}</p>
                    </div>
                    <button 
                        className="achievement-alert-close"
                        onClick={() => setAchievementAlert(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="profile-container">
                <div className="profile-cover"></div>
                <div className="profile-header">
                    <div className="profile-image-container">
                        {profile && profile.profile_picture ? (
                            <img 
                                src={`http://127.0.0.1:8000/media/${profile.profile_picture}`} 
                                alt="Profile" 
                                className="profile-image" 
                            />
                        ) : (
                            <div className="profile-image" style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                backgroundColor: '#f5f3ff',
                                color: '#6d28d9',
                                fontSize: '36px',
                                fontWeight: '600'
                            }}>
                                {getInitial(username)}
                            </div>
                        )}
                    </div>
                    <h2 className="profile-name">{username}</h2>
                    <div className="profile-email">{email ? email : "No email provided"}</div>
                    <button 
                        className="profile-action-button"
                        onClick={() => navigate(`/profile/${username}/update`)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit Profile
                    </button>
                </div>

                <div className="profile-body">
                    <div className="profile-section">
                        <h3 className="section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Profile Information
                        </h3>
                        <div className="profile-info">
                            <div className="info-row">
                                <div className="info-label">Bio</div>
                                <div className="info-value">{profile.bio || "No bio added yet."}</div>
                            </div>
                            <div className="info-row">
                                <div className="info-label">Birth Date</div>
                                <div className="info-value">{profile.birth_date || "Not specified"}</div>
                            </div>
                        </div>
                    </div>

                    <div className="profile-section">
                        <h3 className="section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            Achievements
                            <button 
                                className="profile-action-button secondary"
                                style={{ marginLeft: 'auto', fontSize: '14px', padding: '6px 12px' }}
                                onClick={() => setShowAchievements(prev => !prev)}
                            >
                                {showAchievements ? 'Hide' : 'Show'}
                            </button>
                        </h3>
                        
                        {showAchievements && (
                            <div className="achievements-container">
                                {loading && <div className="achievements-loading">Loading achievements...</div>}
                                
                                {!loading && achievements.length === 0 && (
                                    <p className="no-achievements">You haven't earned any achievements yet. Keep completing tasks!</p>
                                )}
                                
                                {!loading && achievements.length > 0 && (
                                    <div className="achievements-grid">
                                        {achievements.map((achievement) => (
                                            <div key={achievement.id} className="achievement-card">
                                                <div className="achievement-icon">
                                                    {renderAchievementIcon(achievement.achievement.icon)}
                                                </div>
                                                <div className="achievement-details">
                                                    <h4 className="achievement-name">{achievement.achievement.name}</h4>
                                                    <p className="achievement-description">{achievement.achievement.description}</p>
                                                    <p className="achievement-date">Earned on: {new Date(achievement.date_earned).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="profile-section">
                        <h3 className="section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Friends
                            <button 
                                className="profile-action-button secondary"
                                style={{ marginLeft: 'auto', fontSize: '14px', padding: '6px 12px' }}
                                onClick={() => setShowFriends(prev => !prev)}
                            >
                                {showFriends ? 'Hide' : 'Show'}
                            </button>
                        </h3>
                        
                        {showFriends && (
                            <div className="friends-list">
                                {profile.friends && profile.friends.length > 0 ? (
                                    profile.friends.map((friend, index) => (
                                        <div key={index} className="friend-item">
                                            <div className="friend-name">
                                                <div className="friend-avatar">{getInitial(friend)}</div>
                                                {friend}
                                            </div>
                                            <button 
                                                className="profile-action-button danger"
                                                onClick={() => handleRemoveFriend(friend)}
                                                style={{ padding: '6px 12px', fontSize: '14px' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p>No friends yet.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="profile-section">
                        <h3 className="section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Friend Requests
                        </h3>
                        
                        <div className="request-list">
                            {friendRequests.length > 0 ? (
                                friendRequests.map((request, index) => (
                                    <div key={index} className="request-item">
                                        <div className="friend-name">
                                            <div className="friend-avatar">{getInitial(request.sender)}</div>
                                            {request.sender}
                                        </div>
                                        <div className="request-actions">
                                            <button 
                                                className="profile-action-button" 
                                                onClick={() => handleAcceptRequest(request.sender)}
                                                style={{ padding: '6px 12px', fontSize: '14px' }}
                                            >
                                                Accept
                                            </button>
                                            <button 
                                                className="profile-action-button secondary" 
                                                onClick={() => handleRejectRequest(request.sender)}
                                                style={{ padding: '6px 12px', fontSize: '14px' }}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>No pending friend requests.</p>
                            )}
                        </div>
                    </div>

                    <div className="profile-section">
                        <h3 className="section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            Add Friends
                        </h3>
                        
                        <div className="search-container">
                            <input 
                                type="text" 
                                className="search-input"
                                placeholder="Search for users..." 
                                value={friendUsername} 
                                onChange={handleSearch} 
                            />
                            
                            {searchResults.length > 0 && (
                                <div className="search-results">
                                    {searchResults.map((result, index) => (
                                        <div key={index} className="search-result-item">
                                            <div className="friend-name">
                                                <div className="friend-avatar">{getInitial(result)}</div>
                                                {result}
                                            </div>
                                            <button 
                                                className="profile-action-button" 
                                                onClick={() => handleAddFriend(result)}
                                                style={{ padding: '6px 12px', fontSize: '14px' }}
                                            >
                                                Add Friend
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {friendUsername && searchResults.length === 0 && (
                                <p>No users found</p>
                            )}
                        </div>
                    </div>

                    {message && (
                        <div className="status-message">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;