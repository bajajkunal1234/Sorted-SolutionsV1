'use client'

import { FileText, Image as ImageIcon, Video, Download } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/helpers';

function LogNoteItem({ note }) {
    const getFileIcon = (file) => {
        if (!file) return <FileText size={16} />;

        const name = file.name?.toLowerCase() || '';
        if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return <ImageIcon size={16} />;
        if (name.match(/\.(mp4|mov|avi|webm)$/)) return <Video size={16} />;
        return <FileText size={16} />;
    };

    return (
        <div className="card">
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: 'var(--spacing-sm)'
            }}>
                <div>
                    <strong style={{ fontSize: 'var(--font-size-sm)' }}>
                        {note.addedBy}
                    </strong>
                    <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-tertiary)',
                        marginTop: 'var(--spacing-xs)'
                    }}>
                        {formatDateTime(note.timestamp)}
                    </div>
                </div>
            </div>

            <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-primary)',
                marginBottom: note.files && note.files.length > 0 ? 'var(--spacing-md)' : 0
            }}>
                {note.description}
            </p>

            {note.files && note.files.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 'var(--spacing-sm)'
                }}>
                    {note.files.map((file, index) => (
                        <div
                            key={index}
                            style={{
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                fontSize: 'var(--font-size-xs)',
                                cursor: 'pointer'
                            }}
                        >
                            {getFileIcon(file)}
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                width: '100%',
                                textAlign: 'center'
                            }}>
                                {file.name || 'File'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default LogNoteItem;
