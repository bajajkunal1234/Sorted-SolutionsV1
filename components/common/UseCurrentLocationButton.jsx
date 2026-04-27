'use client'
import { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

/**
 * UseCurrentLocationButton
 *
 * A shared button that calls navigator.geolocation.getCurrentPosition()
 * and fires onChange({ lat, lng }) on success.
 *
 * Props:
 *   onChange  {fn}     — called with { lat, lng }
 *   style     {object} — optional style overrides for the button
 *   label     {string} — button text (default: "Use My Current Location")
 */
export default function UseCurrentLocationButton({ onChange, style = {}, label = 'Use My Current Location' }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleClick = () => {
        if (!navigator.geolocation) {
            setError('Location not supported by your browser.')
            return
        }
        setLoading(true)
        setError('')
        setSuccess(false)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                onChange({ lat, lng })
                setLoading(false)
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
            },
            (err) => {
                setLoading(false)
                if (err.code === 1) {
                    setError('Location access denied. Please allow location in your browser settings.')
                } else if (err.code === 2) {
                    setError('Location unavailable. Try dragging the pin manually.')
                } else {
                    setError('Could not get location. Try dragging the pin manually.')
                }
                setTimeout(() => setError(''), 5000)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const base = {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
        background: success
            ? 'rgba(16,185,129,0.15)'
            : 'rgba(56,189,248,0.12)',
        color: success ? '#10b981' : '#38bdf8',
        border: `1px solid ${success ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.25)'}`,
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.2s',
        width: '100%',
        ...style,
    }

    return (
        <div>
            <button type="button" onClick={handleClick} disabled={loading} style={base}>
                {loading
                    ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    : <MapPin size={15} />
                }
                {loading ? 'Getting location...' : success ? '✓ Location set!' : label}
            </button>
            {error && (
                <div style={{
                    marginTop: 6, fontSize: 12, color: '#f87171',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, padding: '6px 10px',
                }}>
                    {error}
                </div>
            )}
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
