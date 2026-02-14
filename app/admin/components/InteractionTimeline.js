'use client'

import { Clock, User } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/helpers';

function InteractionTimeline({ interactions }) {
    const getInteractionIcon = (type) => {
        switch (type) {
            case 'created':
                return '🆕';
            case 'technician_assigned':
                return '👤';
            case 'status_changed':
                return '🔄';
            case 'note_added':
                return '📝';
            case 'call':
                return '📞';
            case 'sms':
                return '💬';
            default:
                return '•';
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
                position: 'absolute',
                left: '15px',
                top: '20px',
                bottom: '20px',
                width: '2px',
                backgroundColor: 'var(--border-primary)'
            }} />

            {/* Timeline items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {interactions.map((interaction, index) => (
                    <div
                        key={index}
                        style={{
                            position: 'relative',
                            paddingLeft: '40px',
                            paddingBottom: 'var(--spacing-md)'
                        }}
                    >
                        {/* Icon */}
                        <div style={{
                            position: 'absolute',
                            left: '0',
                            top: '0',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '2px solid var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            zIndex: 1
                        }}>
                            {getInteractionIcon(interaction.type)}
                        </div>

                        {/* Content */}
                        <div className="card" style={{ marginBottom: 0 }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'start',
                                marginBottom: 'var(--spacing-xs)'
                            }}>
                                <strong style={{ fontSize: 'var(--font-size-sm)' }}>
                                    {interaction.message}
                                </strong>
                                <span style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-tertiary)',
                                    whiteSpace: 'nowrap',
                                    marginLeft: 'var(--spacing-sm)'
                                }}>
                                    {formatRelativeTime(interaction.timestamp)}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--text-secondary)'
                            }}>
                                <User size={12} />
                                {interaction.user}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default InteractionTimeline;
