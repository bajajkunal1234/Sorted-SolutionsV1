import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Loader2, ArrowRightLeft } from 'lucide-react';
import { accountsAPI } from '@/lib/adminAPI';

export default function JournalEntryForm({ existingEntry, onSave, onCancel }) {
    const isReadOnly = existingEntry?.id && existingEntry.reference_type && existingEntry.reference_type !== 'manual';
    
    const [date, setDate] = useState(existingEntry?.date?.split('T')[0] || new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState(existingEntry?.notes || '');
    const [lines, setLines] = useState(() => {
        if (existingEntry?.lines?.length > 0) {
            return existingEntry.lines.map((l, idx) => {
                const isDebit = parseFloat(l.debit) > 0;
                return {
                    id: Date.now().toString() + idx,
                    type: isDebit ? 'debit' : 'credit',
                    account_id: l.account_id,
                    account_name: l.account?.name || '',
                    amount: isDebit ? l.debit : l.credit
                };
            });
        }
        return [
            { id: '1', type: 'debit', account_id: '', account_name: '', amount: '' },
            { id: '2', type: 'credit', account_id: '', account_name: '', amount: '' }
        ];
    });
    const [ledgers, setLedgers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setLoading(true);
        accountsAPI.getAll()
            .then(res => {
                // Filter out non-ledger groupings if any, or just show all
                const data = res?.sort((a,b) => a.name.localeCompare(b.name)) || [];
                setLedgers(data);
            })
            .finally(() => setLoading(false));
    }, []);

    const addLine = () => {
        setLines([...lines, { id: Date.now().toString(), type: 'debit', account_id: '', account_name: '', amount: '' }]);
    };

    const removeLine = (id) => {
        if (lines.length <= 2) return;
        setLines(lines.filter(l => l.id !== id));
    };

    const updateLine = (id, field, value) => {
        if (field === 'account_id') {
            const acc = ledgers.find(l => l.id === value);
            setLines(lines.map(l => l.id === id ? { ...l, account_id: value, account_name: acc?.name || '' } : l));
        } else {
            setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
        }
    };

    const totalDebit = lines.filter(l => l.type === 'debit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const totalCredit = lines.filter(l => l.type === 'credit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isValid = totalDebit > 0 && diff < 0.01 && lines.every(l => l.account_id && Number(l.amount) > 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid) return alert('Journal is unbalanced or missing account details.');

        const payload = {
            date,
            reference_type: 'manual',
            notes,
            lines: lines.map(l => ({
                account_id: l.account_id,
                debit: l.type === 'debit' ? parseFloat(l.amount) : 0,
                credit: l.type === 'credit' ? parseFloat(l.amount) : 0,
                description: ''
            }))
        };

        try {
            setSaving(true);
            const method = existingEntry?.id ? 'PUT' : 'POST';
            const finalPayload = existingEntry?.id ? { ...payload, id: existingEntry.id } : payload;

            const res = await fetch('/api/admin/journals', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            });
            const data = await res.json();
            if(!data.success) throw new Error(data.error);
            onSave(data.data);
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" style={{ maxWidth: '800px', backgroundColor: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowRightLeft size={20} color="var(--color-primary)" />
                        {existingEntry?.id ? 'Journal Voucher Details' : 'Journal Voucher'}
                        {isReadOnly && <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#f59e0b20', color: '#f59e0b', borderRadius: '4px' }}>Auto-Generated</span>}
                    </h2>
                    <button className="btn-icon" onClick={onCancel} disabled={saving}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div className="form-group" style={{ width: '150px' }}>
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} disabled={isReadOnly} required />
                        </div>
                        
                        {existingEntry?.id && (
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px', backgroundColor: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                                <div><span style={{ color: 'var(--text-tertiary)' }}>Entry No:</span> <strong style={{color: 'var(--text-primary)'}}>{existingEntry.entry_number}</strong></div>
                                <div><span style={{ color: 'var(--text-tertiary)' }}>Created By:</span> <strong style={{color: 'var(--text-primary)'}}>{existingEntry.created_by || 'Admin'}</strong></div>
                                <div><span style={{ color: 'var(--text-tertiary)' }}>Created At:</span> <strong style={{color: 'var(--text-primary)'}}>{new Date(existingEntry.created_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</strong></div>
                            </div>
                        )}
                    </div>

                    {/* Lines Grid */}
                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 140px 140px 40px', gap: '12px', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            <div>Dr / Cr</div>
                            <div>Particulars (Ledger)</div>
                            <div style={{ textAlign: 'right' }}>Debit (₹)</div>
                            <div style={{ textAlign: 'right' }}>Credit (₹)</div>
                            <div></div>
                        </div>

                        {lines.map((line, index) => (
                            <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 140px 140px 40px', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                                <select 
                                    className="form-select" 
                                    value={line.type} 
                                    disabled={isReadOnly}
                                    onChange={e => updateLine(line.id, 'type', e.target.value)}
                                    style={{ fontWeight: 600, color: line.type === 'debit' ? '#3b82f6' : '#10b981' }}
                                >
                                    <option value="debit">Dr</option>
                                    <option value="credit">Cr</option>
                                </select>

                                <select 
                                    className="form-select" 
                                    value={line.account_id} 
                                    required 
                                    disabled={isReadOnly}
                                    onChange={e => updateLine(line.id, 'account_id', e.target.value)}
                                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                                >
                                    <option value="">Select Ledger...</option>
                                    {ledgers.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} — [{l.under}]</option>
                                    ))}
                                </select>

                                <div>
                                    {line.type === 'debit' ? (
                                        <input type="number" step="0.01" min="0" required className="form-input" disabled={isReadOnly} style={{ textAlign: 'right', fontWeight: 600 }} value={line.amount} onChange={e => updateLine(line.id, 'amount', e.target.value)} />
                                    ) : <div style={{ textAlign: 'right', padding: '8px', color: 'var(--text-tertiary)' }}>-</div>}
                                </div>

                                <div>
                                    {line.type === 'credit' ? (
                                        <input type="number" step="0.01" min="0" required className="form-input" disabled={isReadOnly} style={{ textAlign: 'right', fontWeight: 600 }} value={line.amount} onChange={e => updateLine(line.id, 'amount', e.target.value)} />
                                    ) : <div style={{ textAlign: 'right', padding: '8px', color: 'var(--text-tertiary)' }}>-</div>}
                                </div>

                                <button type="button" onClick={() => removeLine(line.id)} className="btn-icon" style={{ color: lines.length > 2 && !isReadOnly ? 'var(--color-danger)' : 'var(--text-tertiary)' }} disabled={lines.length <= 2 || isReadOnly}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {!isReadOnly && (
                            <div style={{ marginTop: '16px' }}>
                                <button type="button" onClick={addLine} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                    <Plus size={14} style={{ marginRight: '4px' }}/> Add Line
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Totals & Narration */}
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Narration</label>
                            <textarea className="form-input" rows="3" placeholder="Being..." value={notes} onChange={e => setNotes(e.target.value)} disabled={isReadOnly} />
                        </div>
                        
                        <div style={{ width: '300px', backgroundColor: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 600 }}>
                                <span>Total Debit:</span>
                                <span style={{ color: '#3b82f6' }}>₹{totalDebit.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 600 }}>
                                <span>Total Credit:</span>
                                <span style={{ color: '#10b981' }}>₹{totalCredit.toFixed(2)}</span>
                            </div>
                            <div style={{ height: '1px', backgroundColor: 'var(--border-primary)', margin: '8px 0' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: diff > 0.01 ? '#ef4444' : 'var(--text-secondary)' }}>
                                <span>Difference:</span>
                                <span>₹{diff.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer" style={{ marginTop: 0 }}>
                        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>{isReadOnly ? 'Close' : 'Cancel'}</button>
                        {!isReadOnly && (
                            <button type="submit" className="btn btn-primary" disabled={saving || !isValid} style={{ opacity: isValid ? 1 : 0.5 }}>
                                {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} style={{ marginRight: '8px' }} />}
                                {saving ? 'Saving...' : 'Save Voucher'}
                            </button>
                        )}
                    </div>

                </form>
            </div>
        </div>
    );
}
