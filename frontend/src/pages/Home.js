import React from 'react';
import './Home.css';
const Home = () => {
    return (
        <div>
            
            <main style={{ padding: '20px' }}>
                <section>
                    <h2>Features</h2>
                    <ul>
                        <li>Dynamic Calendar</li>
                        <li>Task Tracking</li>
                        <li>Collaborative Features</li>
                        <li>Customizable Views</li>
                    </ul>
                </section>
                <section style={{ marginTop: '20px' }}>
                    <h2>Get Started</h2>
                    <p>
                        <a href="/signup" style={{ textDecoration: 'none', color: 'blue' }}>Sign up</a> or{' '}
                        <a href="/login" style={{ textDecoration: 'none', color: 'blue' }}>Log in</a> to start using QuestMate today!
                    </p>
                </section>
            </main>
        </div>
    );
};

export default Home;
