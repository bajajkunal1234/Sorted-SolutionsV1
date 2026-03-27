import dynamic from 'next/dynamic';

/**
 * ClientPinDropMap — SSR-safe wrapper around PinDropMap.
 * Import THIS in all forms instead of importing PinDropMap directly.
 */
const ClientPinDropMap = dynamic(() => import('./PinDropMap'), {
    ssr: false,
    loading: () => (
        <div style={{
            height: '240px', width: '100%', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(56,189,248,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#475569', fontSize: 13, fontWeight: 500,
            gap: 8
        }}>
            🗺️ Loading map...
        </div>
    )
});

export default ClientPinDropMap;
