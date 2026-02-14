'use client'

export default function NearbyAreas({ title, areas, locationName }) {
    return (
        <section className="sublocations-section">
            <div className="container">
                <h2 className="section-title">{title}</h2>
                <div className="sublocations-grid">
                    {areas.map((area, idx) => (
                        <div key={idx} className="sublocation-item">
                            {area}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}



