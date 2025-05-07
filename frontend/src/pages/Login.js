import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { checkAuth } from '../AuthService';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [initialCheck, setInitialCheck] = useState(true);

    useEffect(() => {
        const verifyAuth = async () => {
            const isAuthenticated = await checkAuth();
            if (isAuthenticated) {
                window.location.href = '/calendar';
            }
            setInitialCheck(false);
        };
        
        verifyAuth();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/login/', {
                username,
                password
            });

            localStorage.setItem('access', response.data.access);
            localStorage.setItem('refresh', response.data.refresh);
            localStorage.setItem('username', username);
            setMessage('Login successful!');
            
            setTimeout(() => {
                window.location.href = '/calendar';
            }, 500);
        } catch (error) {
            setMessage(error.response?.data?.error || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (initialCheck) {
        return <div className="loading-container">Checking authentication...</div>;
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h2>Welcome Back</h2>
                    <p className="login-subtitle">Sign in to continue</p>
                </div>
                
                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input 
                            type="text" 
                            id="username"
                            placeholder="Enter your username" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input 
                            type="password" 
                            id="password"
                            placeholder="Enter your password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className={`login-button ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                    
                    {message && <p className={`message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</p>}
                </form>
                
                <div className="login-footer">
                    <a href="/forgot-password" className="forgot-password">Forgot Password?</a>
                    <p className="register-link">Don't have an account? <a href="/register">Sign up</a></p>
                </div>
            </div>
        </div>
    );
};

export default Login;