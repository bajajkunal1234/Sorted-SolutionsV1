'use client'

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Package, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/accountingHelpers';
import { getStockStatusColor, getStockStatusLabel, formatStock } from '@/lib/utils/inventoryHelpers';
import { productCategories } from '@/lib/data/inventoryData';

// Sortable Product Card
function SortableProductCard({ product, onProductClick }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    const statusColor = getStockStatusColor(product.stockStatus);
    const statusLabel = getStockStatusLabel(product.stockStatus);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onProductClick?.(product)}
            className="job-card"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                <Package size={20} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {product.name}
                </h4>
            </div>

            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                {product.sku}
            </div>

            {product.type === 'product' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Stock:</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                        {formatStock(product.currentStock, product.unitOfMeasure)}
                    </span>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DollarSign size={14} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                        {formatCurrency(product.salePrice)}
                    </span>
                </div>
                <span style={{
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    backgroundColor: `${statusColor}20`,
                    color: statusColor,
                    fontWeight: 500
                }}>
                    {statusLabel}
                </span>
            </div>
        </div>
    );
}

function InventoryKanbanView({ products, onProductClick, onProductUpdate }) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Group products by category
    const groupedProducts = products.reduce((acc, product) => {
        const categoryId = product.category;
        const category = productCategories.find(c => c.id === categoryId);
        const categoryName = category?.name || 'Uncategorized';

        if (!acc[categoryName]) {
            acc[categoryName] = [];
        }
        acc[categoryName].push(product);
        return acc;
    }, {});

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over || !onProductUpdate) return;

        const productId = active.id;
        const newCategory = over.id;

        // Find the category ID from the category name
        const category = productCategories.find(c => c.name === newCategory);
        if (!category) return;

        // Update the product's category
        const product = products.find(p => p.id === productId);
        if (product && product.category !== category.id) {
            onProductUpdate({ ...product, category: category.id });
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
                    {Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
                        <div key={categoryName} className="kanban-column">
                            <div className="kanban-column-header">
                                <h3 className="kanban-column-title">{categoryName}</h3>
                                <span className="kanban-column-count">{categoryProducts.length}</span>
                            </div>

                            <SortableContext
                                items={categoryProducts.map(p => p.id)}
                                strategy={verticalListSortingStrategy}
                                id={categoryName}
                            >
                                <div className="kanban-cards">
                                    {categoryProducts.map(product => (
                                        <SortableProductCard
                                            key={product.id}
                                            product={product}
                                            onProductClick={onProductClick}
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

export default InventoryKanbanView;
