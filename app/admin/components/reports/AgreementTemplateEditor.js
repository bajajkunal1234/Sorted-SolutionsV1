import { useState, useEffect } from 'react';
import { Save, RefreshCcw } from 'lucide-react';
import { agreementTemplatesAPI } from '@/lib/adminAPI';

export default function AgreementTemplateEditor({ type, title, placeholders }) {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchTemplate();
    }, [type]);

    const fetchTemplate = async () => {
        try {
            setIsLoading(true);
            const res = await agreementTemplatesAPI.get(type);
            if (res) {
                setContent(res.content || '');
            }
        } catch (error) {
            console.error(`Failed to load ${type} template:`, error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await agreementTemplatesAPI.update(type, content);
            alert(`${title} saved successfully!`);
        } catch (error) {
            console.error(`Failed to save ${type} template:`, error);
            alert('Failed to save template: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const insertPlaceholder = (placeholder) => {
        setContent(prev => prev + ` [${placeholder}] `);
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <RefreshCcw className="animate-spin" style={{ marginRight: '8px' }} size={20} />
                Loading template...
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>{title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', margin: '4px 0 0 0' }}>
                        Customize the text layout for the printed PDF. Use HTML tags for formatting like &lt;h2&gt;, &lt;b&gt;, &lt;br/&gt;.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSaving ? 0.7 : 1 }}
                >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save Template'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 300px) 1fr', gap: 'var(--spacing-lg)', flex: 1 }}>
                {/* Placeholders Guide */}
                <div style={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    border: '1px solid var(--border-primary)', 
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-md)',
                    overflowY: 'auto'
                }}>
                    <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: '0 0 var(--spacing-md) 0' }}>
                        Available Placeholders
                    </h4>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                        Click a placeholder to insert it into the editor. These will automatically be replaced with real data when printing.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                        {placeholders.map((ph) => (
                            <button
                                key={ph}
                                onClick={() => insertPlaceholder(ph)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '6px 10px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontFamily: 'monospace',
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-hover)'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                            >
                                [{ph}]
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your HTML agreement template here..."
                        style={{
                            width: '100%',
                            flex: 1,
                            minHeight: '400px',
                            padding: 'var(--spacing-md)',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            resize: 'vertical'
                        }}
                    />
                </div>
            </div>
            
        </div>
    );
}
