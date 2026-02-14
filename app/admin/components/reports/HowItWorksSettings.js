'use client'

import { useState } from 'react';
import { CheckCircle, Plus, Trash2, Edit2, Save, X, GripVertical, Upload } from 'lucide-react';

function HowItWorksSettings() {
    const [stages, setStages] = useState([
        {
            id: 1,
            title: 'Book Service',
            description: 'Book your service online via our website, mobile app, or by calling our customer support. Choose your preferred time slot.',
            icon: '📅',
            order: 1
        },
        {
            id: 2,
            title: 'Track Technician',
            description: 'Track your assigned technician in real-time on the map. Get live updates on their arrival time and location.',
            icon: '📍',
            order: 2
        },
        {
            id: 3,
            title: 'Technician Visits',
            description: 'Our certified technician visits your location at the scheduled time and diagnoses the issue with your appliance.',
            icon: '🔧',
            order: 3
        },
        {
            id: 4,
            title: 'Repair & Test',
            description: 'Technician repairs your appliance using genuine spare parts and tests it thoroughly to ensure everything works perfectly.',
            icon: '✅',
            order: 4
        }
    ]);

    const [layoutStyle, setLayoutStyle] = useState('grid');
    const [animationType, setAnimationType] = useState('hover');
    const [primaryColor, setPrimaryColor] = useState('#3b82f6');

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newStage, setNewStage] = useState({
        title: '',
        description: '',
        icon: '⚙️'
    });

    const layoutOptions = [
        { value: 'grid', label: 'Grid (Current)', description: '2x2 or 4-column grid layout' },
        { value: 'timeline-vertical', label: 'Vertical Timeline', description: 'Steps connected vertically' },
        { value: 'timeline-horizontal', label: 'Horizontal Timeline', description: 'Steps connected horizontally' },
        { value: 'carousel', label: 'Carousel', description: 'Swipeable carousel view' },
        { value: 'accordion', label: 'Accordion', description: 'Expandable accordion style' }
    ];

    const animationOptions = [
        { value: 'none', label: 'None', description: 'No animation' },
        { value: 'hover', label: 'Hover (Current)', description: 'Animate on hover' },
        { value: 'scroll', label: 'Scroll', description: 'Animate on scroll into view' },
        { value: 'auto', label: 'Auto', description: 'Auto-play animation' }
    ];

    const iconOptions = ['📅', '📍', '🔧', '✅', '📞', '🚗', '👨‍🔧', '🛠️', '⚙️', '💳', '⭐', '📝'];

    const handleEdit = (stage) => {
        setEditingId(stage.id);
        setEditForm({ ...stage });
    };

    const handleSaveEdit = () => {
        setStages(stages.map(s => s.id === editingId ? editForm : s));
        setEditingId(null);
        setEditForm({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this stage?')) {
            setStages(stages.filter(s => s.id !== id));
        }
    };

    const handleAddStage = () => {
        if (newStage.title && newStage.description) {
            const newId = Math.max(...stages.map(s => s.id), 0) + 1;
            setStages([...stages, { ...newStage, id: newId, order: stages.length + 1 }]);
            setNewStage({ title: '', description: '', icon: '⚙️' });
            setShowAddForm(false);
        }
    };

    const handleSaveAll = () => {
        // TODO: Save to backend
        alert('How It Works settings saved successfully!');
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    How It Works Settings
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage process stages and customize the layout and styling
                </p>
            </div>

            {/* Styling Options */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Layout & Styling
                </h4>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {/* Layout Style */}
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                            Layout Style
                        </label>
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                            {layoutOptions.map(option => (
                                <label
                                    key={option.value}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-sm)',
                                        padding: 'var(--spacing-sm)',
                                        border: layoutStyle === option.value ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        backgroundColor: layoutStyle === option.value ? 'var(--color-primary)05' : 'transparent'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="layout"
                                        value={option.value}
                                        checked={layoutStyle === option.value}
                                        onChange={(e) => setLayoutStyle(e.target.value)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                            {option.label}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {option.description}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Animation Type */}
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                            Animation Type
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
                            {animationOptions.map(option => (
                                <label
                                    key={option.value}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-sm)',
                                        padding: 'var(--spacing-sm)',
                                        border: animationType === option.value ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        backgroundColor: animationType === option.value ? 'var(--color-primary)05' : 'transparent'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="animation"
                                        value={option.value}
                                        checked={animationType === option.value}
                                        onChange={(e) => setAnimationType(e.target.value)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                            {option.label}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {option.description}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Primary Color */}
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Primary Color
                        </label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                style={{ width: '60px', height: '40px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                            />
                            <input
                                type="text"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                style={{
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontFamily: 'monospace',
                                    width: '120px'
                                }}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                Used for icons and accents
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add New Stage Button */}
            {!showAddForm && (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                >
                    <Plus size={18} />
                    Add New Stage
                </button>
            )}

            {/* Add Stage Form */}
            {showAddForm && (
                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                        Add New Stage
                    </h4>

                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Stage Title *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Payment & Confirmation"
                                value={newStage.title}
                                onChange={(e) => setNewStage({ ...newStage, title: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Description *
                            </label>
                            <textarea
                                placeholder="Describe this stage of the process..."
                                value={newStage.description}
                                onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Icon
                            </label>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                {iconOptions.map(icon => (
                                    <button
                                        key={icon}
                                        onClick={() => setNewStage({ ...newStage, icon })}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            fontSize: '24px',
                                            border: newStage.icon === icon ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: newStage.icon === icon ? 'var(--color-primary)10' : 'transparent',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        <button
                            onClick={handleAddStage}
                            className="btn btn-primary"
                            disabled={!newStage.title || !newStage.description}
                        >
                            <Save size={16} />
                            Add Stage
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setNewStage({ title: '', description: '', icon: '⚙️' });
                            }}
                            className="btn btn-secondary"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Stages List */}
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {stages.map((stage, index) => (
                    <div
                        key={stage.id}
                        className="card"
                        style={{
                            padding: 'var(--spacing-lg)',
                            border: editingId === stage.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)'
                        }}
                    >
                        {editingId === stage.id ? (
                            // Edit Mode
                            <div>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Stage Title
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.title}
                                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--spacing-sm)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-size-sm)'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Description
                                        </label>
                                        <textarea
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--spacing-sm)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-size-sm)',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Icon
                                        </label>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                            {iconOptions.map(icon => (
                                                <button
                                                    key={icon}
                                                    onClick={() => setEditForm({ ...editForm, icon })}
                                                    style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        fontSize: '24px',
                                                        border: editForm.icon === icon ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        backgroundColor: editForm.icon === icon ? 'var(--color-primary)10' : 'transparent',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                    <button onClick={handleSaveEdit} className="btn btn-primary">
                                        <Save size={16} />
                                        Save
                                    </button>
                                    <button onClick={handleCancelEdit} className="btn btn-secondary">
                                        <X size={16} />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                                <GripVertical size={18} style={{ color: 'var(--text-tertiary)', cursor: 'grab', marginTop: '4px' }} />

                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    backgroundColor: `${primaryColor}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '28px',
                                    flexShrink: 0
                                }}>
                                    {stage.icon}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: primaryColor,
                                            color: 'white',
                                            fontSize: '12px',
                                            fontWeight: 700
                                        }}>
                                            {index + 1}
                                        </span>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                            {stage.title}
                                        </h4>
                                    </div>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                        {stage.description}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                    <button
                                        onClick={() => handleEdit(stage)}
                                        className="btn btn-secondary"
                                        style={{ padding: '6px 12px' }}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(stage.id)}
                                        className="btn btn-danger"
                                        style={{ padding: '6px 12px' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Save All Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                <button
                    onClick={handleSaveAll}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    <Save size={18} />
                    Save All Changes
                </button>
            </div>
        </div>
    );
}

export default HowItWorksSettings;
