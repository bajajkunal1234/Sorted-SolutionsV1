'use client'
// List view for transaction subtabs inside app/admin
// Delegates to the shared component from components/accounts/
import TransactionListView from '@/components/accounts/TransactionListView';

function TransactionsListView({ items, tab, onItemClick, groupBy }) {
    return <TransactionListView items={items} tab={tab} onItemClick={onItemClick} groupBy={groupBy} />;
}

export default TransactionsListView;
