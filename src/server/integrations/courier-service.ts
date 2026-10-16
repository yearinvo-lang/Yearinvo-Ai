import { db } from '../db.ts';
import type { CourierDelivery, CourierTrackingSummary, CourierProvider, DeliveryStatus } from '../../types/index.ts';
import { getDhakaDateRange } from './meta-service.ts';

/**
 * Bangladesh Couriers Integration Service
 * Supports Steadfast, Pathao, RedX, Paperfly, and Manual CSV Delivery Import
 */
export class CourierIntegrationService {
  /**
   * Get delivery metrics and tracking summary for a workspace strictly for today in Asia/Dhaka
   */
  public static async getTodayMetrics(workspaceId: string): Promise<CourierTrackingSummary> {
    const { start: dhakaStart, end: dhakaEnd } = getDhakaDateRange();
    const deliveries = db.getDeliveries(workspaceId);

    const creds = db.getIntegrationCredential('courier');
    const integ = db.getGlobalIntegration('integ_courier');

    const activeProviders = (creds?.activeProviders || integ?.metadata?.activeProviders || ['steadfast', 'pathao', 'manual']) as CourierProvider[];

    let deliveredToday = 0;
    let inTransit = 0;
    let pendingPickup = 0;
    let attemptedOrFailed = 0;
    let returnedOrCancelled = 0;
    let codCollectedToday = 0;
    let codPending = 0;

    for (const d of deliveries) {
      const deliveredTime = d.deliveredAt ? new Date(d.deliveredAt) : null;
      const isDeliveredToday = deliveredTime && deliveredTime >= dhakaStart && deliveredTime <= dhakaEnd;

      switch (d.status) {
        case 'delivered':
          if (isDeliveredToday || (!deliveredTime && new Date(d.updatedAt) >= dhakaStart)) {
            deliveredToday += 1;
            if (d.codCollected) {
              codCollectedToday += d.codAmount;
            }
          }
          break;
        case 'in_transit':
          inTransit += 1;
          codPending += d.codAmount;
          break;
        case 'pending_pickup':
          pendingPickup += 1;
          codPending += d.codAmount;
          break;
        case 'attempted_failed':
          attemptedOrFailed += 1;
          codPending += d.codAmount;
          break;
        case 'returned':
        case 'cancelled':
          returnedOrCancelled += 1;
          break;
      }
    }

    return {
      isConnected: true,
      activeProviders,
      totalShipments: deliveries.length,
      deliveredToday,
      inTransit,
      pendingPickup,
      attemptedOrFailed,
      returnedOrCancelled,
      codCollectedToday,
      codPending,
      deliveries: deliveries.slice(0, 10), // Most recent deliveries
      lastSyncAt: new Date().toISOString(),
    };
  }

  /**
   * Parse CSV delivery records uploaded by merchant
   * Columns: orderNumber, recipientName, recipientPhone, recipientAddress, codAmount, courierProvider, trackingCode, status
   */
  public static parseCsvDeliveries(workspaceId: string, csvContent: string): { successCount: number; errors: string[] } {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { successCount: 0, errors: ['CSV file is empty or missing data rows.'] };
    }

    const header = lines[0].toLowerCase();
    const rows = lines.slice(1);
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const parts = rows[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 5) {
        errors.push(`Row ${i + 2}: Insufficient columns`);
        continue;
      }

      const [orderNumber, recipientName, recipientPhone, recipientAddress, codStr, providerStr, trackingCode, statusStr] = parts;

      const codAmount = parseFloat(codStr) || 0;
      const courierProvider = (providerStr?.toLowerCase() || 'steadfast') as CourierProvider;
      let status: DeliveryStatus = 'pending_pickup';
      const sLower = (statusStr || '').toLowerCase();
      if (sLower.includes('deliv')) status = 'delivered';
      else if (sLower.includes('transit') || sLower.includes('shipped')) status = 'in_transit';
      else if (sLower.includes('fail') || sLower.includes('attempt')) status = 'attempted_failed';
      else if (sLower.includes('return') || sLower.includes('cancel')) status = 'returned';

      const existing = db.getDeliveries(workspaceId).find((d) => d.trackingCode === trackingCode || d.orderNumber === orderNumber);
      if (existing) {
        db.updateDelivery(existing.id, {
          status,
          codCollected: status === 'delivered',
          deliveredAt: status === 'delivered' ? new Date().toISOString() : existing.deliveredAt,
          updatedAt: new Date().toISOString(),
        });
        successCount++;
      } else {
        const delivery: CourierDelivery = {
          id: `del_csv_${Date.now()}_${i}`,
          workspaceId,
          orderId: `ord_csv_${Date.now()}_${i}`,
          orderNumber: orderNumber || `YIA-CSV-${i + 1}`,
          courierProvider,
          trackingCode: trackingCode || `TRK-CSV-${Date.now().toString().slice(-6)}-${i}`,
          recipientName: recipientName || 'Customer',
          recipientPhone: recipientPhone || '',
          recipientAddress: recipientAddress || '',
          codAmount,
          codCollected: status === 'delivered',
          status,
          statusDetails: 'Imported via CSV batch tracking update',
          lastSyncAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.addDelivery(delivery);
        successCount++;
      }
    }

    return { successCount, errors };
  }
}
