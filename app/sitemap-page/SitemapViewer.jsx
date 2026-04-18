'use client'

export default function SitemapViewer({ staticLinks, categories, subcategories, locations, sublocations }) {
    const toLabel = (slug) => slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const totalUrls = staticLinks.length + categories.length + subcategories.length + locations.length + sublocations.length;

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
            <style>{`
                .smap-card { display:block; padding:10px 14px; background:#1e293b; border:1px solid #334155; border-radius:8px; text-decoration:none; transition:border-color .15s, background .15s; }
                .smap-card:hover { background:#1e3a5f; border-color:#6366f1; }
                .smap-card.green:hover  { background:#052e16; border-color:#10b981; }
                .smap-card.amber:hover  { background:#2d1f00; border-color:#f59e0b; }
                .smap-card.pink:hover   { background:#2d0a1f; border-color:#ec4899; }
                .smap-card.sky:hover    { background:#082030; border-color:#0ea5e9; }
                .smap-card-label { font-size:13px; font-weight:600; color:#e2e8f0; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .smap-card-label.sm { font-size:12px; }
                .smap-card-url { font-size:11px; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .smap-section { margin-bottom:40px; }
                .smap-section-header { display:flex; align-items:center; gap:10px; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid rgba(255,255,255,0.06); }
                .smap-grid { display:grid; gap:8px; }
                .smap-sub-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; padding-left:4px; }
            `}</style>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderBottom: '1px solid #1e293b', padding: '40px 0 32px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🗺️</div>
                                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>Site Map</h1>
                            </div>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: 15 }}>
                                Complete directory of all active pages on <strong style={{ color: '#818cf8' }}>sortedsolutions.in</strong>
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 18px', textAlign: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{totalUrls}</div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Total Indexed Pages</div>
                            </div>
                            <a href="/sitemap.xml" target="_blank" rel="noreferrer" style={{ background: '#6366f1', color: '#fff', borderRadius: 10, padding: '10px 18px', textDecoration: 'none', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                📄 XML Sitemap
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px 60px' }}>

                {/* Main Pages */}
                <div className="smap-section">
                    <div className="smap-section-header">
                        <span style={{ fontSize: 18 }}>🏠</span>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Main Pages</h2>
                        <span style={{ marginLeft: 'auto', background: '#6366f122', color: '#6366f1', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{staticLinks.length} pages</span>
                    </div>
                    <div className="smap-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                        {staticLinks.map(l => <Card key={l.url} label={l.label} url={l.url} />)}
                    </div>
                </div>

                {/* Category Pages */}
                {categories.length > 0 && (
                    <div className="smap-section">
                        <div className="smap-section-header">
                            <span style={{ fontSize: 18 }}>🔧</span>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Service Category Pages</h2>
                            <span style={{ marginLeft: 'auto', background: '#10b98122', color: '#10b981', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{categories.length} pages</span>
                        </div>
                        <div className="smap-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                            {categories.map(c => <Card key={c.slug} label={`${toLabel(c.slug)}`} url={c.url} color="green" />)}
                        </div>
                    </div>
                )}

                {/* Subcategory Pages */}
                {subcategories.length > 0 && (
                    <div className="smap-section">
                        <div className="smap-section-header">
                            <span style={{ fontSize: 18 }}>⚙️</span>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Service Subcategory Pages</h2>
                            <span style={{ marginLeft: 'auto', background: '#f59e0b22', color: '#f59e0b', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{subcategories.length} pages</span>
                        </div>
                        {categories.map(cat => {
                            const subs = subcategories.filter(s => s.catSlug === cat.slug);
                            if (subs.length === 0) return null;
                            return (
                                <div key={cat.slug} style={{ marginBottom: 20 }}>
                                    <div className="smap-sub-label" style={{ color: '#f59e0b' }}>{toLabel(cat.slug)}</div>
                                    <div className="smap-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                                        {subs.map(s => <Card key={s.slug} label={toLabel(s.slug)} url={s.url} color="amber" sm />)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Location Pages */}
                {locations.length > 0 && (
                    <div className="smap-section">
                        <div className="smap-section-header">
                            <span style={{ fontSize: 18 }}>📍</span>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Location Pages</h2>
                            <span style={{ marginLeft: 'auto', background: '#ec489922', color: '#ec4899', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{locations.length} pages</span>
                        </div>
                        <div className="smap-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                            {locations.map(loc => <Card key={loc.slug} label={toLabel(loc.slug)} url={loc.url} color="pink" sm />)}
                        </div>
                    </div>
                )}

                {/* Sub-location Pages */}
                {sublocations.length > 0 && (
                    <div className="smap-section">
                        <div className="smap-section-header">
                            <span style={{ fontSize: 18 }}>🗺️</span>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Service × Location Pages</h2>
                            <span style={{ marginLeft: 'auto', background: '#0ea5e922', color: '#0ea5e9', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{sublocations.length} pages</span>
                        </div>
                        {categories.map(cat => {
                            const slocs = sublocations.filter(s => s.catSlug === cat.slug);
                            if (slocs.length === 0) return null;
                            return (
                                <div key={cat.slug} style={{ marginBottom: 20 }}>
                                    <div className="smap-sub-label" style={{ color: '#0ea5e9' }}>{toLabel(cat.slug)}</div>
                                    <div className="smap-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                                        {slocs.map(s => <Card key={s.url} label={`${toLabel(s.catSlug)} in ${toLabel(s.locSlug)}`} url={s.url} color="sky" sm />)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

            </div>
        </div>
    );
}

function Card({ label, url, color = '', sm }) {
    return (
        <a href={url} className={`smap-card ${color}`}>
            <div className={`smap-card-label${sm ? ' sm' : ''}`}>{label}</div>
            <div className="smap-card-url">{url}</div>
        </a>
    );
}
