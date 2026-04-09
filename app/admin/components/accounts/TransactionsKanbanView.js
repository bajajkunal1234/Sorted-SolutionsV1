'use client'
// Kanban view for transaction subtabs inside app/admin
// Delegates to the shared component from components/accounts/
import TransactionKanbanView from '@/components/accounts/TransactionKanbanView';

function TransactionsKanbanView({ items, tab, onItemClick, groupBy }) {
    return <TransactionKanbanView items={items} tab={tab} onItemClick={onItemClick} groupBy={groupBy} />;
}

export default TransactionsKanbanView;
