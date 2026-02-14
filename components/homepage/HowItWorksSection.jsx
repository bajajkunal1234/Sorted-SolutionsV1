'use client'

import { useState } from 'react';
import './HowItWorksSection.css';

function HowItWorksSection() {
    const [activeStep, setActiveStep] = useState(1);

    const stages = [
        {
            id: 1,
            title: 'Book Online',
            description: 'Choose your appliance, select the issue, and pick a convenient time slot in just 60 seconds',
            icon: '📱',
            color: '#6366f1',
            image: '🎯',
            stats: '60 sec'
        },
        {
            id: 2,
            title: 'Track Live',
            description: 'Real-time GPS tracking shows exactly when your technician will arrive at your doorstep',
            icon: '📍',
            color: '#10b981',
            image: '🗺️',
            stats: 'Real-time'
        },
        {
            id: 3,
            title: 'Expert Fix',
            description: 'Certified technicians diagnose and repair using genuine parts with transparent pricing',
            icon: '🔧',
            color: '#f59e0b',
            image: '⚡',
            stats: '90% same day'
        },
        {
            id: 4,
            title: 'Pay Secure',
            description: 'Digital payment with instant receipt and automatic 90-day warranty activation',
            icon: '✅',
            color: '#8b5cf6',
            image: '🛡️',
            stats: '90-day warranty'
        }
    ];

    return (
        <section className="how-it-works-creative">
            <div className="creative-container">
                {/* Header with animated background */}
                <div className="creative-header">
                    <div className="floating-shapes">
                        <div className="shape shape-1"></div>
                        <div className="shape shape-2"></div>
                        <div className="shape shape-3"></div>
                    </div>
                    <h2 className="creative-title">How It Works</h2>
                    <p className="creative-subtitle">Your repair journey in 4 simple steps</p>
                </div>

                {/* Split Screen Interactive Layout */}
                <div className="split-screen-layout">
                    {/* Left Side - Step Navigation */}
                    <div className="steps-navigation">
                        {stages.map((stage, index) => (
                            <div
                                key={stage.id}
                                className={`step-nav-item ${activeStep === stage.id ? 'active' : ''}`}
                                onClick={() => setActiveStep(stage.id)}
                                onMouseEnter={() => setActiveStep(stage.id)}
                            >
                                <div className="step-nav-number" style={{ background: stage.color }}>
                                    {index + 1}
                                </div>
                                <div className="step-nav-content">
                                    <div className="step-nav-icon">{stage.icon}</div>
                                    <h3 className="step-nav-title">{stage.title}</h3>
                                    <div className="step-nav-stat">{stage.stats}</div>
                                </div>
                                <div className="step-nav-arrow">→</div>
                            </div>
                        ))}
                    </div>

                    {/* Right Side - Active Step Display */}
                    <div className="step-display">
                        {stages.map((stage) => (
                            <div
                                key={stage.id}
                                className={`step-display-content ${activeStep === stage.id ? 'active' : ''}`}
                            >
                                <div className="step-display-visual">
                                    <div className="step-display-icon" style={{ background: stage.color }}>
                                        {stage.image}
                                    </div>
                                    <div className="step-display-circle" style={{ borderColor: stage.color }}></div>
                                    <div className="step-display-pulse" style={{ background: stage.color }}></div>
                                </div>
                                <div className="step-display-text">
                                    <span className="step-display-label">Step {stage.id}</span>
                                    <h3 className="step-display-title">{stage.title}</h3>
                                    <p className="step-display-description">{stage.description}</p>
                                    <div className="step-display-badge" style={{ background: `${stage.color}20`, color: stage.color }}>
                                        {stage.stats}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${(activeStep / stages.length) * 100}%`,
                                background: stages[activeStep - 1]?.color
                            }}
                        ></div>
                    </div>
                    <div className="progress-text">
                        Step {activeStep} of {stages.length}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HowItWorksSection;



