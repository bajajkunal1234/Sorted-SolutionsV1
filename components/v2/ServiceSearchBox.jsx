'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Wrench } from 'lucide-react';
import { V2_CATEGORIES, formatINR } from '@/lib/v2/catalogConfig';

/**
 * Shared live search input for Desktop Header and Mobile Hero.
 */
export default function ServiceSearchBox({ variant = 'desktop', placeholder = "Search for 'AC foam jet service'" }) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        const handleOutside = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    useEffect(() => {
        const q = query.trim();
        if (!q) {
            setResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/v2/services?q=${encodeURIComponent(q)}`);
                const json = await res.json();
                if (json.success) {
                    setResults((json.services || []).slice(0, 6));
                }
            } catch (_) {}
        }, 160);
        return () => clearTimeout(timer);
    }, [query]);

    const matchingCats = query.trim()
        ? V2_CATEGORIES.filter(c =>
              c.name.toLowerCase().includes(query.trim().toLowerCase()) ||
              c.shortLabel.toLowerCase().includes(query.trim().toLowerCase())
          )
        : [];

    const handleSelect = (href) => {
        setOpen(false);
        setQuery('');
        router.push(href);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (results[0]) {
            handleSelect(`/v2/services/${results[0].categorySlug}`);
        } else if (matchingCats[0]) {
            handleSelect(`/v2/services/${matchingCats[0].slug}`);
        } else if (query.trim()) {
            handleSelect(`/v2/services/ac-repair?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const isMobileHero = variant === 'mobile-hero';

    return (
        <div ref={wrapRef} className={isMobileHero ? 'v2-hero-search-mobile' : 'v2-search-box'}>
            <form
                onSubmit={handleSubmit}
                className={isMobileHero ? 'v2-hero-search-pill' : 'v2-search-input-wrap'}
            >
                <Search size={17} color="#64748b" style={{ flexShrink: 0 }} />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    aria-label="Search appliance services"
                />
            </form>

            {open && query.trim().length > 0 && (matchingCats.length > 0 || results.length > 0) && (
                <div className="v2-search-dropdown">
                    {matchingCats.map(cat => (
                        <button
                            key={cat.slug}
                            type="button"
                            className="v2-search-result-btn"
                            onClick={() => handleSelect(`/v2/services/${cat.slug}`)}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                    src={cat.icon}
                                    alt={cat.name}
                                    style={{ width: 28, height: 28, objectFit: 'contain' }}
                                />
                                <span>
                                    <strong style={{ display: 'block', fontSize: 13.5 }}>{cat.name}</strong>
                                    <span style={{ fontSize: 11.5, color: '#64748b' }}>Browse Category</span>
                                </span>
                            </span>
                            <ArrowRight size={15} color="#64748b" />
                        </button>
                    ))}
                    {results.map(svc => (
                        <button
                            key={svc.id}
                            type="button"
                            className="v2-search-result-btn"
                            onClick={() => handleSelect(`/v2/services/${svc.categorySlug}?highlight=${svc.id}`)}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <Wrench size={16} color="#6338f5" style={{ flexShrink: 0 }} />
                                <span style={{ minWidth: 0 }}>
                                    <strong style={{ display: 'block', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {svc.name}
                                    </strong>
                                    <span style={{ fontSize: 11.5, color: '#64748b' }}>{svc.categoryName}</span>
                                </span>
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', flexShrink: 0 }}>
                                {formatINR(svc.price)}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
