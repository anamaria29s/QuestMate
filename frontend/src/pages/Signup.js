import React, { useState } from 'react';
import axios from 'axios';
import './Signup.css';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/signup/', {
                username,
                email,
                password
            });

            localStorage.setItem('access', response.data.access);
            localStorage.setItem('refresh', response.data.refresh);
            localStorage.setItem('username', username);
            localStorage.setItem('email', email); 
            setMessage('Signup successful! You can now log in.');
            setIsLoading(false);
        } catch (error) {
            setMessage(error.response?.data?.error || 'Signup failed');
            setIsLoading(false);
        }
    };

    return (
        <div className="signup-container">
            <div className="signup-card">
                <h2 className="signup-title">Create Account</h2>
                <form onSubmit={handleSignup} className="signup-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input 
                            id="username"
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input 
                            id="email"
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input 
                            id="password"
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className="signup-button"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing up...' : 'Sign Up'}
                    </button>
                </form>
                
                {message && (
                    <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}
                
                <div className="login-link">
                    Already have an account? <a href="/login">Log in</a>
                </div>
            </div>
        </div>
    );
};

export default Signup;