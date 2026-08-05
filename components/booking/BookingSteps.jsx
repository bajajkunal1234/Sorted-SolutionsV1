'use client';

import { Check } from 'lucide-react';
import './BookingWizard.css';

const steps = [
    { id: 'location', name: 'Availability' },
    { id: 'logistics', name: 'Booking' },
    { id: 'otp', name: 'Verification' },
];

export default function BookingSteps({ currentStep, availabilitySummary, bookingSummary }) {
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
                            {step.id === 'location' && availabilitySummary && (
                                <span className="step-subtext">{availabilitySummary}</span>
                            )}
                            {step.id === 'logistics' && bookingSummary && (
                                <span className="step-subtext">{bookingSummary}</span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
