'use client'

import { useState, useEffect } from 'react';
import './HowItWorksSection.css';

function HowItWorksSection({
    title = "How It Works",
    subtitle = null
}) {
    const [activeStep, setActiveStep] = useState(1);
    const [stages, setStages] = useState([
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
    ]);
    const [config, setConfig] = useState({
        primaryColor: '#3b82f6',
        layout: 'grid'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resSteps = await fetch('/api/settings/how-it-works');
                const dataSteps = await resSteps.json();
                if (dataSteps.success && dataSteps.data?.length > 0) {
                    setStages(dataSteps.data.map(s => ({
                        ...s,
                        color: config.primaryColor // Use config color for steps
                    })));
                }

                const resConfig = await fetch('/api/settings/section-configs?id=how-it-works');
                const dataConfig = await resConfig.json();
                if (dataConfig.success && dataConfig.data) {
                    const newConfig = {
                        primaryColor: dataConfig.data.primary_color || '#3b82f6',
                        layout: dataConfig.data.layout_style || 'grid'
                    };
                    setConfig(newConfig);

                    // Update colors of stages if we didn't get specific colors from API
                    setStages(prev => prev.map(s => ({ ...s, color: newConfig.primaryColor })));
                }
            } catch (error) {
                console.error('Error fetching dynamic How It Works data:', error);
            }
        };
        fetchData();
    }, []);

    if (stages.length === 0) return null;

    return (
        <section className="how-it-works">
            <div className="section-container">
                <div className="how-it-works-header">
                    <h2 className="how-it-works-title">{title}</h2>
                    <p className="how-it-works-description">
                        {subtitle || `Your repair journey in ${stages.length} simple steps`}
                    </p>
                </div>

                <div className="steps-grid">
                    {stages.map((stage, index) => (
                        <div key={stage.id} className="step-card">
                            <div className="step-number-badge">{index + 1}</div>
                            <div className="step-content">
                                <div className="step-icon-circle" style={{ background: `${stage.color}15`, color: stage.color }}>
                                    {stage.icon}
                                </div>
                                <h3 className="step-card-title">{stage.title}</h3>
                                <p className="step-card-description">{stage.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default HowItWorksSection;



