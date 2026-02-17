'use client';

import { Check } from 'lucide-react';
import './BookingWizard.css';

const steps = [
    { id: 'service', name: 'Service Detail' },
    { id: 'contact', name: 'Contact' },
    { id: 'slot', name: 'Date-Time' },
    { id: 'review', name: 'Review' },
];

export default function BookingSteps({ currentStep }) {
    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <nav aria-label="Progress">
            <ul className="stepper-list">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent = step.id === currentStep;

                    return (
                        <li
                            key={step.id}
                            className={`step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
                        >
                            <div className="step-icon">
                                {isCompleted ? (
                                    <Check size={18} />
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </div>
                            <span className="step-label">{step.name}</span>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
