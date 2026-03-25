import dynamic from 'next/dynamic';

const MapVisualizer = dynamic(() => import('./MapVisualizer'), {
    ssr: false,
    loading: () => (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
            Loading Map...
        </div>
    )
});

export default function LiveMap(props) {
    return <MapVisualizer {...props} />;
}
