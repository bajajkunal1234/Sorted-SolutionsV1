'use client'

import { useState } from 'react';
import { Shield, Save, User } from 'lucide-react';

function TechnicianPermissions() {
    const [technicians, setTechnicians] = useState([
        {
            id: 't1',
            name: 'Amit Patel',
            permissions: {
                viewJobs: true,
                updateJobStatus: true,
                submitExpenses: true,
                viewInventory: true,
                updateInventory: false,
                viewCustomerDetails: true,
                editCustomerDetails: false,
                viewReports: false
            }
        },
        {
            id: 't2',
            name: 'Rahul Singh',
            permissions: {
                viewJobs: true,
                updateJobStatus: true,
                submitExpenses: true,
                viewInventory: true,
                updateInventory: false,
                viewCustomerDetails: true,
                editCustomerDetails: false,
                viewReports: false
            }
        },
        {
            id: 't3',
            name: 'Vikram Kumar',
            permissions: {
                viewJobs: true,
                updateJobStatus: true,
                submitExpenses: true,
                viewInventory: true,
                updateInventory: true,
                viewCustomerDetails: true,
                editCustomerDetails: true,
                viewReports: true
            }
        }
    ]);

    const permissionsList = [
        { id: 'viewJobs', label: 'View Jobs', description: 'Can see assigned jobs' },
        { id: 'updateJobStatus', label: 'Update Job Status', description: 'Can mark jobs as complete/in-progress' },
        { id: 'submitExpenses', label: 'Submit Expenses', description: 'Can submit daily expenses' },
        { id: 'viewInventory', label: 'View Inventory', description: 'Can see inventory items' },
        { id: 'updateInventory', label: 'Update Inventory', description: 'Can add/remove inventory items' },
        { id: 'viewCustomerDetails', label: 'View Customer Details', description: 'Can see customer information' },
        { id: 'editCustomerDetails', label: 'Edit Customer Details', description: 'Can modify customer information' },
        { id: 'viewReports', label: 'View Reports', description: 'Can access reports and analytics' }
    ];

    const togglePermission = (techId, permissionId) => {
        setTechnicians(technicians.map(tech => {
            if (tech.id === techId) {
                return {
                    ...tech,
                    permissions: {
                        ...tech.permissions,
                        [permissionId]: !tech.permissions[permissionId]
                    }
                };
            }
            return tech;
        }));
    };

    const handleSave = () => {
        alert('Permissions saved successfully!');
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                        Technician Permissions
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Manage access control for technicians
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    style={{ padding: '8px 16px' }}
                >
                    <Save size={16} />
                    Save All Permissions
                </button>
            </div>

            {/* Permissions Table */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        <thead>
                            <tr style={{
                                backgroundColor: 'var(--bg-secondary)',
                                borderBottom: '2px solid var(--border-primary)',
                                position: 'sticky',
                                top: 0
                            }}>
                                <th style={{
                                    padding: 'var(--spacing-md)',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    minWidth: '200px'
                                }}>
                                    Permission
                                </th>
                                {technicians.map(tech => (
                                    <th key={tech.id} style={{
                                        padding: 'var(--spacing-md)',
                                        textAlign: 'center',
                                        fontWeight: 600,
                                        minWidth: '120px'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            <User size={16} />
                                            {tech.name}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {permissionsList.map(permission => (
                                <tr
                                    key={permission.id}
                                    style={{
                                        borderBottom: '1px solid var(--border-primary)',
                                        transition: 'background-color var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ padding: 'var(--spacing-md)' }}>
                                        <div>
                                            <div style={{ fontWeight: 500, marginBottom: '2px' }}>
                                                {permission.label}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                                {permission.description}
                                            </div>
                                        </div>
                                    </td>
                                    {technicians.map(tech => (
                                        <td key={tech.id} style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={tech.permissions[permission.id]}
                                                onChange={() => togglePermission(tech.id, permission.id)}
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    cursor: 'pointer',
                                                    accentColor: 'var(--color-primary)'
                                                }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default TechnicianPermissions;





