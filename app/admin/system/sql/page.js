'use client'

import { useState } from 'react'

export default function SQLRunnerPage() {
    const [query, setQuery] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const runQuery = async () => {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const res = await fetch('/api/admin/system/sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            })

            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error || 'Query failed')
            }

            setResult(data.data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Secure SQL Runner</h1>
            <p className="text-sm text-gray-500 mb-4">
                Executes raw SQL via <code>exec_sql</code> RPC function.
                <br />
                <span className="text-red-500 font-bold">WARNING: This tool has full database access. Use with caution.</span>
            </p>

            <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM customers LIMIT 5;"
                style={{
                    width: '100%',
                    height: '150px',
                    padding: '10px',
                    fontFamily: 'monospace',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginBottom: '10px'
                }}
            />

            <button
                onClick={runQuery}
                disabled={loading || !query.trim()}
                style={{
                    padding: '8px 16px',
                    backgroundColor: loading ? '#ccc' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                {loading ? 'Executing...' : 'Run SQL'}
            </button>

            {error && (
                <div style={{
                    marginTop: '20px',
                    padding: '10px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '4px'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {result && (
                <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                    <h3 className="font-bold mb-2">Result ({Array.isArray(result) ? result.length : 0} rows):</h3>
                    {Array.isArray(result) && result.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f3f4f6' }}>
                                    {Object.keys(result[0]).map(key => (
                                        <th key={key} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {result.map((row, i) => (
                                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                                        {Object.values(row).map((val, j) => (
                                            <td key={j} style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <pre style={{ backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '4px' }}>
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </div>
    )
}
