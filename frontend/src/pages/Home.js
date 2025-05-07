import React from 'react';
import './Home.css';
import { motion } from 'framer-motion';


const Home = () => {
    return (
        <div className="home-container">
            <div className="hero-section">
                <motion.div 
                    className="hero-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1>Organize Together. Achieve More.</h1>
                    <p className="tagline">
                        QuestMate helps you track tasks, collaborate with friends, and stay motivated on your journey to productivity.
                    </p>
                    <div className="hero-buttons">
                        <motion.button 
                            className="primary-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.location.href = '/signup'}
                        >
                            Get Started
                        </motion.button>
                        <motion.button 
                            className="secondary-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.location.href = '/login'}
                        >
                            Log In
                        </motion.button>
                    </div>
                </motion.div>
                
            </div>

            <motion.div 
                className="features-section"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
            >
                <h2>Why Choose QuestMate?</h2>
                <div className="features-grid">
                    <motion.div 
                        className="feature-card"
                        whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                    >
                        <div className="feature-icon">📅</div>
                        <h3>Dynamic Calendar</h3>
                        <p>Keep track of all your tasks in an intuitive, easy-to-use calendar interface.</p>
                    </motion.div>
                    
                    <motion.div 
                        className="feature-card"
                        whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                    >
                        <div className="feature-icon">✓</div>
                        <h3>Task Tracking</h3>
                        <p>Add, edit, and complete tasks with a simple, streamlined workflow.</p>
                    </motion.div>
                    
                    <motion.div 
                        className="feature-card"
                        whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                    >
                        <div className="feature-icon">👥</div>
                        <h3>Collaboration</h3>
                        <p>Share calendars with friends and work together on shared tasks and goals.</p>
                    </motion.div>
                    
                    <motion.div 
                        className="feature-card"
                        whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                    >
                        <div className="feature-icon">🏆</div>
                        <h3>Achievements</h3>
                        <p>Earn rewards and track your progress as you complete tasks and reach milestones.</p>
                    </motion.div>
                </div>
            </motion.div>

            <motion.div 
                className="cta-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
            >
                <h2>Ready to boost your productivity?</h2>
                <p>Join thousands of users who have transformed their task management with QuestMate.</p>
                <motion.button 
                    className="primary-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.location.href = '/signup'}
                >
                    Sign Up Free
                </motion.button>
            </motion.div>
        </div>
    );
};

export default Home;