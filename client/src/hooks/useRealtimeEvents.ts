import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { soundService } from '@/utils/sound';
import { toast } from 'sonner';

export function useRealtimeEvents() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      if (!isMounted) return;

      try {
        const es = new EventSource('/api/events');
        eventSourceRef.current = es;

        es.addEventListener('ORDER_CREATED', (e) => {
          try {
            const { data: order } = JSON.parse(e.data);
            
            // Invalidate all related order and dashboard queries immediately
            queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });

            // Play incoming order chime
            soundService.playOrderChime();

            // Toast alert
            const tableText = order?.tableNumber
              ? `Mesa #${order.tableNumber}`
              : order?.type === 'DINE_IN'
              ? 'En Mesa'
              : order?.type === 'PICKUP'
              ? 'Para Llevar'
              : 'Domicilio';

            toast.info(`🔔 ¡Nueva Comanda en Vivo! #${order?.orderNumber || order?.id?.slice(-4)}`, {
              description: `${tableText} · Total: $${Number(order?.total || 0).toLocaleString()}`,
              duration: 6000,
            });
          } catch (err) {
            console.error('Error handling ORDER_CREATED event:', err);
          }
        });

        es.addEventListener('ORDER_STATUS_UPDATED', () => {
          try {
            queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          } catch (err) {
            console.error('Error handling ORDER_STATUS_UPDATED event:', err);
          }
        });

        es.addEventListener('INVENTORY_UPDATED', (e: any) => {
          try {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-report'] });
            queryClient.invalidateQueries({ queryKey: ['recipes'] });

            const parsed = e?.data ? JSON.parse(e.data) : null;
            const item = parsed?.data;
            if (item?.isLowStock && item?.name) {
              toast.warning(`⚠️ Stock Bajo: ${item.name}`, {
                description: `Quedan ${item.currentStock} unidades en inventario`,
                duration: 5000,
              });
            }
          } catch (err) {
            console.error('Error handling INVENTORY_UPDATED event:', err);
          }
        });

        es.onerror = () => {
          es.close();
          if (isMounted) {
            // Reconnect after 4 seconds
            reconnectTimeout = setTimeout(connect, 4000);
          }
        };
      } catch (err) {
        console.error('SSE connection error:', err);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [queryClient]);
}
