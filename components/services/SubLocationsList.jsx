'use client'

import './SubLocationsList.css'

export default function SubLocationsList({ title, sublocations, locationName }) {
    return (
        <section className="sublocations-section">
            <div className="container">
                <h2 className="section-title">{title}</h2>
                <div className="sublocations-grid">
                    {sublocations.map((sublocation, idx) => (
                        <div key={idx} className="sublocation-item">
                            Appliance Repairing in {sublocation}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}



