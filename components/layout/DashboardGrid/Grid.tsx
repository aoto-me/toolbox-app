'use client';

import {
  closestCenter,
  DndContext,
  type DragOverEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSyncExternalStore } from 'react';
import BrowserCompat from '@/components/tools/BrowserCompat';
import FileUpload from '@/components/tools/FileUpload';
import Memo from '@/components/tools/Memo';
import PriceCalculator from '@/components/tools/PriceCalculator';
import styles from './index.module.scss';

type ToolId = 'browserCompat' | 'fileUpload' | 'memo' | 'priceCalculator';

const TOOL_DEFS: Record<
  ToolId,
  { Component: React.ComponentType; fullWidth?: boolean; title: string; variant?: 'dark' }
> = {
  browserCompat: { Component: BrowserCompat, title: 'Web Compat' },
  fileUpload: { Component: FileUpload, fullWidth: true, title: 'Files', variant: 'dark' },
  memo: { Component: Memo, title: 'Memo' },
  priceCalculator: { Component: PriceCalculator, title: 'Price Calc' },
};

const DEFAULT_ORDER: ToolId[] = ['memo', 'priceCalculator', 'fileUpload', 'browserCompat'];
const LS_KEY = 'dashboard-tool-order';

function loadOrder(): ToolId[] {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return DEFAULT_ORDER;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return DEFAULT_ORDER;
    const valid = parsed.filter((id): id is ToolId => id in TOOL_DEFS);
    const missing = DEFAULT_ORDER.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  } catch {
    return DEFAULT_ORDER;
  }
}

let currentOrder: null | ToolId[] = null;
const orderListeners = new Set<() => void>();

export default function DashboardGrid() {
  const order = useSyncExternalStore(subscribeOrder, getOrderSnapshot, getServerOrderSnapshot);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 500, tolerance: 8 },
    })
  );

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as ToolId;
    const overId = over.id as ToolId;

    if (activeId === 'fileUpload') {
      // fileUpload は行単位スワップ
      if (overId === 'fileUpload') return;
      updateOrder((current) => {
        const singles = current.filter((id) => id !== 'fileUpload');
        const overInSingles = singles.indexOf(overId);
        if (overInSingles === -1) return current;
        const rowStart = overInSingles % 2 === 0 ? overInSingles : overInSingles - 1;
        const newOrder: ToolId[] = [...singles];
        newOrder.splice(rowStart, 0, 'fileUpload');
        return newOrder;
      });
    } else {
      // 単体アイテムは通常スワップ（fileUpload をまたぐ移動はスキップ）
      if (overId === 'fileUpload') return;
      updateOrder((current) => {
        const oldIndex = current.indexOf(activeId);
        const newIndex = current.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return current;
        return arrayMove(current, oldIndex, newIndex);
      });
    }
  }

  function handleDragEnd() {
    if (currentOrder) {
      localStorage.setItem(LS_KEY, JSON.stringify(currentOrder));
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      sensors={sensors}
    >
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className={styles.grid}>
          {order.map((id) => (
            <SortableItem id={id} key={id} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function getOrderSnapshot(): ToolId[] {
  currentOrder ??= loadOrder();
  return currentOrder;
}

function getServerOrderSnapshot(): ToolId[] {
  return DEFAULT_ORDER;
}

function SortableItem({ id }: { id: ToolId }) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id,
  });
  const { Component, fullWidth, title, variant } = TOOL_DEFS[id];
  const isDark = variant === 'dark';
  const isWide = fullWidth === true;

  return (
    <div
      className={[
        styles.item,
        isDragging ? styles['item--dragging'] : '',
        isDark ? styles['item--dark'] : '',
        isWide ? styles['item--wide'] : '',
      ]
        .filter(Boolean)
        .join(' ')}
      ref={setNodeRef}
      style={
        {
          '--dnd-transform': CSS.Transform.toString(transform) ?? 'none',
          '--dnd-transition': transition ?? 'none',
        } as React.CSSProperties
      }
    >
      <div className={styles.item__frame}>
        <div className={styles.item__card}>
          <div className={styles.item__innerLine} />
          <div className={styles.item__header} {...attributes} {...listeners} tabIndex={-1}>
            <span className={styles.item__title}>{title}</span>
            <span className={styles.item__stars}>
              <span className={styles.item__starsInner}>
                <img alt="" height={10} src="/img/hexagram.svg" width={9} />
                <img alt="" height={14} src="/img/hexagram.svg" width={13} />
                <img alt="" height={10} src="/img/hexagram.svg" width={9} />
              </span>
            </span>
          </div>
          <div className={styles.item__body}>
            <Component />
          </div>
        </div>
      </div>
    </div>
  );
}

function subscribeOrder(listener: () => void) {
  orderListeners.add(listener);
  return () => orderListeners.delete(listener);
}

function updateOrder(updater: (current: ToolId[]) => ToolId[]) {
  currentOrder = updater(getOrderSnapshot());
  orderListeners.forEach((listener) => {
    listener();
  });
}
