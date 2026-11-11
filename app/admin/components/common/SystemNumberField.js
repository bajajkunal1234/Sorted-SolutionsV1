'use client'

import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

/**
 * Fetches a non-incrementing preview of the next sequential voucher/code number
 * from `/api/admin/voucher-settings` when creating a new record.
 */
export function useVoucherPreview(voucherType, existingValue, fallback = '') {
    const [preview, setPreview] = useState(existingValue || fallback);

    useEffect(() => {
        if (existingValue) {
            setPreview(existingValue);
            return;
        }
        if (!voucherType) {
            setPreview(fallback);
            return;
        }
        let cancelled = false;
        setPreview(fallback);
        fetch(`/api/admin/voucher-settings?action=preview&type=${encodeURIComponent(voucherType)}`)
            .then(r => r.json())
            .then(res => {
                if (!cancelled && res?.success && res.preview) {
                    setPreview(res.preview);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [voucherType, existingValue, fallback]);

    return existingValue || preview || fallback;
}

/**
 * Non-editable, non-focusable display field for system-generated voucher / SKU numbers.
 */
export default function SystemNumberField({
    label,
    value,
    placeholder = 'Auto-generated on save',
    compact = false,
}) {
    return (
        <div>
            {label && (
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: compact ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
                    fontWeight: 500,
                    marginBottom: 'var(--spacing-xs)',
                    color: 'var(--text-primary)'
                }}>
                    <span>{label}</span>
                    <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-primary)',
                        letterSpacing: '0.02em'
                    }}>
                        System Generated
                    </span>
                </label>
            )}
            <div
                aria-readonly="true"
                title="System-generated sequential number (cannot be edited manually)"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: compact ? '6px 10px' : 'var(--spacing-sm) var(--spacing-md)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    backgroundColor: 'var(--bg-tertiary)',
                    color: value ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    cursor: 'not-allowed',
                    userSelect: 'none',
                    opacity: 0.9,
                    minHeight: compact ? '34px' : '38px',
                    boxSizing: 'border-box'
                }}
            >
                <Lock size={13} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontStyle: value ? 'normal' : 'italic'
                }}>
                    {value || placeholder}
                </span>
            </div>
        </div>
    );
}
