'use client'

import { Calculator, TrendingDown, CheckCircle } from 'lucide-react';
import './CostCalculatorPreview.css';

function CostCalculatorPreview() {
    return (
        <section className="cost-calculator-preview">
            <div className="section-container">
                {/* USP Badge */}
                <div className="usp-badge">
                    <span className="badge-icon">🏆</span>
                    <span>India's First Transparent Pricing for Appliance Repairs</span>
                </div>

                <h2 className="section-title">Know Your Repair Cost Upfront</h2>
                <p className="section-description">
                    No hidden charges. No surprises. See exact repair costs before booking.
                </p>

                {/* Calculator Preview Card */}
                <div className="calculator-card">
                    <div className="calculator-icon">
                        <Calculator size={48} />
                    </div>

                    <h3>Instant Cost Estimate</h3>
                    <p>Get transparent pricing breakdown in seconds</p>

                    {/* Features */}
                    <div className="calculator-features">
                        <div className="feature-item">
                            <CheckCircle size={18} />
                            <span>Labor charges included</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle size={18} />
                            <span>Spare parts pricing</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle size={18} />
                            <span>Service charge breakdown</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle size={18} />
                            <span>Compare with market rates</span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button className="calculator-cta">
                        <Calculator size={20} />
                        Calculate Your Repair Cost
                    </button>

                    {/* Trust Line */}
                    <div className="trust-line">
                        <TrendingDown size={16} />
                        <span>Verified by 500+ customers | No surprise charges</span>
                    </div>
                </div>

                {/* Why Transparent Pricing */}
                <div className="why-transparent">
                    <h3>Why Our Transparent Pricing?</h3>
                    <div className="benefits-grid">
                        <div className="benefit">
                            <span className="benefit-icon">💰</span>
                            <strong>Save Money</strong>
                            <p>Know costs before repair starts</p>
                        </div>
                        <div className="benefit">
                            <span className="benefit-icon">🛡️</span>
                            <strong>No Hidden Fees</strong>
                            <p>What you see is what you pay</p>
                        </div>
                        <div className="benefit">
                            <span className="benefit-icon">⚡</span>
                            <strong>Quick Quotes</strong>
                            <p>Get estimates in under 30 seconds</p>
                        </div>
                        <div className="benefit">
                            <span className="benefit-icon">✅</span>
                            <strong>Pay After Repair</strong>
                            <p>Only pay when satisfied</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default CostCalculatorPreview;



