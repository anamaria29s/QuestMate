import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
    const [menuVisible, setMenuVisible] = useState(false);
    const navigate = useNavigate();

    const token = localStorage.getItem('access');
    const username = localStorage.getItem('username');

    const handleLogout = () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        navigate('/login');
    };

    const toggleMenu = () => {
        setMenuVisible(!menuVisible);
    };

    return (
        <header className="header">
            <div className="left-header">
                <button onClick={toggleMenu} className="menu-button">☰</button>
                <h1>QuestMate</h1>
            </div>

            <nav>
                {token ? (
                    <div className="auth-container">
                        <Link to={`/profile/${username}`} className="profile-link">
                            Welcome, {username}!
                        </Link>
                        <button onClick={handleLogout} className="logout-button">Logout</button>
                    </div>
                ) : (
                    <div className="nav-links">
                        <Link to="/login">Login</Link>
                        <Link to="/signup">Sign Up</Link>
                    </div>
                )}

                {menuVisible && (
                    <div className="dropdown-menu">
                        <Link to="/home" className="dropdown-item">Home</Link>
                        <Link to="/calendar" className="dropdown-item">Calendar</Link>
                        <Link to="/sharedcalendars" className="dropdown-item">Shared Calendars</Link>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default Header;
