'use client'

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import { formatCurrency, getGroupPath } from '../../utils/accountingHelpers';
import { accountGroups } from '../../data/accountingData';

// Sortable Account Card
function SortableAccountCard({ account, onAccountClick }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: account.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    const isPositive = (account.closingBalance || 0) >= 0;
    const groupPath = getGroupPath(account.under, accountGroups);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onAccountClick?.(account)}
            className="job-card"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                <User size={20} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {account.name}
                </h4>
            </div>

            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                {account.sku}
            </div>

            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                {groupPath}
            </div>

            {account.jobsDone > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                    <Briefcase size={12} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {account.jobsDone} jobs
                    </span>
                </div>
            )}

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 'var(--spacing-sm)',
                borderTop: '1px solid var(--border-primary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isPositive ? (
                        <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />
                    ) : (
                        <TrendingDown size={14} style={{ color: 'var(--color-danger)' }} />
                    )}
                    <span style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 600,
                        color: isPositive ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                        {formatCurrency(Math.abs(account.closingBalance))}
                    </span>
                </div>
                <span style={{
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    backgroundColor: isPositive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                    color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
                    fontWeight: 500
                }}>
                    {isPositive ? 'Receivable' : 'Payable'}
                </span>
            </div>
        </div>
    );
}

function AccountsKanbanView({ accounts, onAccountClick, onAccountUpdate }) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Group accounts by type
    const groupedAccounts = accounts.reduce((acc, account) => {
        const type = account.type || 'other';
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);

        if (!acc[typeName]) {
            acc[typeName] = [];
        }
        acc[typeName].push(account);
        return acc;
    }, {});

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over || !onAccountUpdate) return;

        const accountId = active.id;
        const newType = over.id.toLowerCase();

        // Update the account's type
        const account = accounts.find(a => a.id === accountId);
        if (account && account.type !== newType) {
            onAccountUpdate({ ...account, type: newType });
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="kanban-container">
                <div className="kanban-board">
                    {Object.entries(groupedAccounts).map(([typeName, typeAccounts]) => (
                        <div key={typeName} className="kanban-column">
                            <div className="kanban-column-header">
                                <h3 className="kanban-column-title">{typeName}</h3>
                                <span className="kanban-column-count">{typeAccounts.length}</span>
                            </div>

                            <SortableContext
                                items={typeAccounts.map(a => a.id)}
                                strategy={verticalListSortingStrategy}
                                id={typeName}
                            >
                                <div className="kanban-cards">
                                    {typeAccounts.map(account => (
                                        <SortableAccountCard
                                            key={account.id}
                                            account={account}
                                            onAccountClick={onAccountClick}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </div>
                    ))}
                </div>
            </div>
        </DndContext>
    );
}

export default AccountsKanbanView;




