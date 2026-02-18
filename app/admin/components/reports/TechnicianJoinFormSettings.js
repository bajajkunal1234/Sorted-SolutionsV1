'use client'

import { UserPlus, Plus, Trash2, Edit2, Save, X, FileText, Upload, Loader2, RefreshCcw } from 'lucide-react';
import { websiteSettingsAPI } from '@/lib/adminAPI';

function TechnicianJoinFormSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formFields, setFormFields] = useState([
        { id: 1, name: 'fullName', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your full name', order: 1 },
        { id: 2, name: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'your.email@example.com', order: 2 },
        { id: 3, name: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+91 XXXXXXXXXX', order: 3 },
        { id: 4, name: 'location', label: 'Current Location', type: 'text', required: true, placeholder: 'e.g., Andheri, Mumbai', order: 4 },
        { id: 5, name: 'experience', label: 'Years of Experience', type: 'number', required: true, placeholder: '0', order: 5 },
        { id: 6, name: 'specialization', label: 'Specialization', type: 'select', required: true, options: ['AC Repair', 'Washing Machine', 'Refrigerator', 'Microwave', 'All Appliances'], order: 6 },
        { id: 7, name: 'resume', label: 'Upload Resume', type: 'file', required: true, accept: '.pdf,.doc,.docx', order: 7 },
        { id: 8, name: 'availability', label: 'Availability', type: 'select', required: true, options: ['Immediate', 'Within 1 Month', 'Within 3 Months'], order: 8 },
        { id: 9, name: 'message', label: 'Additional Message', type: 'textarea', required: false, placeholder: 'Tell us about yourself...', order: 9 }
    ]);

    const [formSettings, setFormSettings] = useState({
        formTitle: 'Join Our Team of Expert Technicians',
        formDescription: 'We are always looking for skilled technicians to join our team. Fill out the form below and we will get back to you soon.',
        successMessage: 'Thank you for your interest! We will review your application and contact you within 3-5 business days.',
        errorMessage: 'There was an error submitting your application. Please try again or contact us directly.',
        submitButtonText: 'Submit Application',
        emailNotifications: true,
        notificationEmail: 'hr@sortedsolutions.in',
        autoReply: true,
        autoReplySubject: 'Application Received - Sorted Solutions',
        autoReplyMessage: 'Dear {name},\n\nThank you for your interest in joining Sorted Solutions. We have received your application and will review it shortly.\n\nBest regards,\nHR Team'
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const [fieldsData, configData] = await Promise.all([
                websiteSettingsAPI.getByKey('technician-join-fields'),
                websiteSettingsAPI.getByKey('technician-join-config')
            ]);

            if (fieldsData && fieldsData.value) setFormFields(fieldsData.value);
            if (configData && configData.value) setFormSettings(configData.value);
        } catch (err) {
            console.error('Failed to fetch technician join form settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newField, setNewField] = useState({
        name: '',
        label: '',
        type: 'text',
        required: false,
        placeholder: ''
    });

    const fieldTypes = [
        { value: 'text', label: 'Text Input' },
        { value: 'email', label: 'Email' },
        { value: 'tel', label: 'Phone Number' },
        { value: 'number', label: 'Number' },
        { value: 'textarea', label: 'Text Area' },
        { value: 'select', label: 'Dropdown' },
        { value: 'file', label: 'File Upload' },
        { value: 'date', label: 'Date' }
    ];

    const handleEdit = (field) => {
        setEditingId(field.id);
        setEditForm({ ...field });
    };

    const handleSaveEdit = () => {
        setFormFields(formFields.map(f => f.id === editingId ? editForm : f));
        setEditingId(null);
        setEditForm({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this field?')) {
            setFormFields(formFields.filter(f => f.id !== id));
        }
    };

    const handleAddField = () => {
        if (newField.name && newField.label) {
            const newId = Math.max(...formFields.map(f => f.id), 0) + 1;
            setFormFields([...formFields, { ...newField, id: newId, order: formFields.length + 1 }]);
            setNewField({ name: '', label: '', type: 'text', required: false, placeholder: '' });
            setShowAddForm(false);
        }
    };

    const handleSaveAll = async () => {
        try {
            setSaving(true);
            await Promise.all([
                websiteSettingsAPI.save('technician-join-fields', formFields, 'Custom fields for technician application form'),
                websiteSettingsAPI.save('technician-join-config', formSettings, 'Configuration and email settings for technician join form')
            ]);
            alert('Technician Join Form settings saved successfully!');
        } catch (err) {
            console.error('Failed to save technician join form settings:', err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                            Technician Join Form Settings
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            Configure the form that technicians use to apply to join your team
                        </p>
                    </div>
                    <button
                        className="btn btn-secondary"
                        onClick={fetchSettings}
                        disabled={loading}
                        style={{ padding: '6px 12px' }}
                    >
                        <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
                    <Loader2 className="spin" size={48} style={{ margin: '0 auto var(--spacing-md) auto', display: 'block' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading form settings...</p>
                </div>
            ) : (
                <>

                    {/* Form Settings */}
                    <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#8b5cf615',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FileText size={20} style={{ color: '#8b5cf6' }} />
                            </div>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                Form Configuration
                            </h4>
                        </div>

                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Form Title
                                </label>
                                <input
                                    type="text"
                                    value={formSettings.formTitle}
                                    onChange={(e) => setFormSettings({ ...formSettings, formTitle: e.target.value })}
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
                                    Form Description
                                </label>
                                <textarea
                                    value={formSettings.formDescription}
                                    onChange={(e) => setFormSettings({ ...formSettings, formDescription: e.target.value })}
                                    rows={2}
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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Success Message
                                    </label>
                                    <textarea
                                        value={formSettings.successMessage}
                                        onChange={(e) => setFormSettings({ ...formSettings, successMessage: e.target.value })}
                                        rows={2}
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
                                        Error Message
                                    </label>
                                    <textarea
                                        value={formSettings.errorMessage}
                                        onChange={(e) => setFormSettings({ ...formSettings, errorMessage: e.target.value })}
                                        rows={2}
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
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Submit Button Text
                                </label>
                                <input
                                    type="text"
                                    value={formSettings.submitButtonText}
                                    onChange={(e) => setFormSettings({ ...formSettings, submitButtonText: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-sm)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email Notifications */}
                    <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                            Email Notifications
                        </h4>

                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formSettings.emailNotifications}
                                    onChange={(e) => setFormSettings({ ...formSettings, emailNotifications: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                        Send email notifications for new applications
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        You will receive an email whenever someone submits the form
                                    </div>
                                </div>
                            </label>

                            {formSettings.emailNotifications && (
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Notification Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={formSettings.notificationEmail}
                                        onChange={(e) => setFormSettings({ ...formSettings, notificationEmail: e.target.value })}
                                        placeholder="hr@sortedsolutions.in"
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                            )}

                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formSettings.autoReply}
                                    onChange={(e) => setFormSettings({ ...formSettings, autoReply: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                        Send auto-reply to applicants
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Applicants will receive an automatic confirmation email
                                    </div>
                                </div>
                            </label>

                            {formSettings.autoReply && (
                                <>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Auto-Reply Subject
                                        </label>
                                        <input
                                            type="text"
                                            value={formSettings.autoReplySubject}
                                            onChange={(e) => setFormSettings({ ...formSettings, autoReplySubject: e.target.value })}
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
                                            Auto-Reply Message
                                        </label>
                                        <textarea
                                            value={formSettings.autoReplyMessage}
                                            onChange={(e) => setFormSettings({ ...formSettings, autoReplyMessage: e.target.value })}
                                            rows={4}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--spacing-sm)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-size-sm)',
                                                resize: 'vertical',
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 'var(--spacing-xs) 0 0 0' }}>
                                            Use {'{name}'} to insert the applicant's name
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Add New Field Button */}
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                        >
                            <Plus size={18} />
                            Add Custom Field
                        </button>
                    )}

                    {/* Add Field Form */}
                    {showAddForm && (
                        <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                Add Custom Field
                            </h4>

                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Field Name (ID) *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., certifications"
                                            value={newField.name}
                                            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--spacing-sm)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-size-sm)',
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Field Label *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Certifications"
                                            value={newField.label}
                                            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--spacing-sm)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-size-sm)'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Field Type
                                        </label>
                                        <select
                                            value={newField.type}
                                            onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--spacing-sm)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-size-sm)'
                                            }}
                                        >
                                            {fieldTypes.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', height: '100%', paddingTop: '24px' }}>
                                            <input
                                                type="checkbox"
                                                checked={newField.required}
                                                onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Required Field</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Placeholder Text
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., List your certifications..."
                                        value={newField.placeholder}
                                        onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                <button
                                    onClick={handleAddField}
                                    className="btn btn-primary"
                                    disabled={!newField.name || !newField.label}
                                >
                                    <Save size={16} />
                                    Add Field
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewField({ name: '', label: '', type: 'text', required: false, placeholder: '' });
                                    }}
                                    className="btn btn-secondary"
                                >
                                    <X size={16} />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Form Fields List */}
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        {formFields.map((field, index) => (
                            <div
                                key={field.id}
                                className="card"
                                style={{
                                    padding: 'var(--spacing-lg)',
                                    border: editingId === field.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)'
                                }}
                            >
                                {editingId === field.id ? (
                                    // Edit Mode
                                    <div>
                                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                        Field Label
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editForm.label}
                                                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
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
                                                        Placeholder
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editForm.placeholder || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, placeholder: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            padding: 'var(--spacing-sm)',
                                                            border: '1px solid var(--border-primary)',
                                                            borderRadius: 'var(--radius-md)',
                                                            fontSize: 'var(--font-size-sm)'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.required}
                                                    onChange={(e) => setEditForm({ ...editForm, required: e.target.checked })}
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Required Field</span>
                                            </label>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--bg-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            flexShrink: 0
                                        }}>
                                            {index + 1}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                                    {field.label}
                                                </h4>
                                                {field.required && (
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        backgroundColor: '#ef444415',
                                                        color: '#ef4444'
                                                    }}>
                                                        REQUIRED
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                <span>Type: {fieldTypes.find(t => t.value === field.type)?.label || field.type}</span>
                                                <span>ID: {field.name}</span>
                                                {field.placeholder && <span>Placeholder: "{field.placeholder}"</span>}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                            <button
                                                onClick={() => handleEdit(field)}
                                                className="btn btn-secondary"
                                                style={{ padding: '6px 12px' }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(field.id)}
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
                            disabled={saving || loading}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                        >
                            {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                            {saving ? 'Saving...' : 'Save All Changes'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default TechnicianJoinFormSettings;
