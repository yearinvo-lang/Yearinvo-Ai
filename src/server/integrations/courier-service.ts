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
   * Resolve Steadfast credentials from environment or database
   */
  public static getSteadfastCredentials(workspaceId?: string): { apiKey: string | null; secretKey: string | null; isConfigured: boolean } {
    const envKey = process.env.STEADFAST_API_KEY || null;
    const envSecret = process.env.STEADFAST_SECRET_KEY || null;

    if (envKey && envSecret) {
      return { apiKey: envKey, secretKey: envSecret, isConfigured: true };
    }

    const creds = db.getIntegrationCredential('courier');
    const apiKey = creds?.apiKey || creds?.steadfastApiKey || null;
    const secretKey = creds?.secretKey || creds?.steadfastSecretKey || null;

    return {
      apiKey,
      secretKey,
      isConfigured: Boolean(apiKey && secretKey),
    };
  }

  /**
   * Book an approved order with Steadfast Courier via official API
   * Endpoint: POST https://portal.steadfast.com.bd/api/v1/create_order
   */
  public static async createSteadfastBooking(
    workspaceId: string,
    orderId: string,
    options?: { note?: string; overrideCodAmount?: number }
  ): Promise<{
    success: boolean;
    consignmentId?: string;
    trackingCode?: string;
    trackingUrl?: string;
    status?: string;
    error?: string;
    message?: string;
    delivery?: CourierDelivery;
  }> {
    const order = db.getOrder(orderId);
    if (!order) {
      return { success: false, error: 'Order not found in database.' };
    }

    if (order.workspaceId !== workspaceId) {
      return { success: false, error: 'Access denied: Order does not belong to active workspace.' };
    }

    // Prevent duplicate booking
    const existingDelivery = db.getDeliveries(workspaceId).find(
      (d) => d.orderId === orderId && d.status !== 'cancelled' && d.status !== 'returned'
    );
    if (existingDelivery && existingDelivery.trackingCode) {
      const trackingUrl = `https://steadfast.com.bd/tracking/${existingDelivery.trackingCode}`;
      return {
        success: true,
        consignmentId: existingDelivery.consignmentId,
        trackingCode: existingDelivery.trackingCode,
        trackingUrl,
        status: existingDelivery.status,
        message: 'Order is already booked with Steadfast Courier.',
        delivery: existingDelivery,
      };
    }

    const { apiKey, secretKey, isConfigured } = this.getSteadfastCredentials(workspaceId);
    if (!isConfigured || !apiKey || !secretKey) {
      return {
        success: false,
        error: 'Steadfast Courier API credentials missing. Please set STEADFAST_API_KEY and STEADFAST_SECRET_KEY in server environment or Settings.',
      };
    }

    // Validate phone number format (must be valid 11 digit Bangladesh phone)
    const cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 11) {
      return {
        success: false,
        error: `Invalid customer phone number: "${order.customerPhone}". Bangladesh couriers require an 11-digit mobile number (e.g. 01712345678).`,
      };
    }

    const codAmount = options?.overrideCodAmount !== undefined
      ? options.overrideCodAmount
      : (order.paymentMethod === 'cash_on_delivery' ? order.total : 0);

    const payload = {
      invoice: order.orderNumber,
      recipient_name: order.customerName,
      recipient_phone: cleanPhone.slice(-11),
      recipient_address: order.deliveryAddress,
      cod_amount: codAmount,
      note: options?.note || order.notes || 'Deliver with care',
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.status !== 200 || !data.consignment) {
        const errorDetail = (data && (data.message || data.errors))
          ? (typeof data.errors === 'object' ? JSON.stringify(data.errors) : data.message)
          : `HTTP ${res.status} from Steadfast API`;
        return {
          success: false,
          error: `Steadfast Booking Error: ${errorDetail}`,
        };
      }

      const consignment = data.consignment;
      const trackingCode = consignment.tracking_code;
      const consignmentId = String(consignment.consignment_id || consignment.id);
      const trackingUrl = `https://steadfast.com.bd/tracking/${trackingCode}`;

      const delivery: CourierDelivery = {
        id: `del_stdf_${Date.now()}`,
        workspaceId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        courierProvider: 'steadfast',
        trackingCode,
        consignmentId,
        recipientName: order.customerName,
        recipientPhone: cleanPhone,
        recipientAddress: order.deliveryAddress,
        codAmount,
        codCollected: false,
        status: 'pending_pickup',
        statusDetails: consignment.status || 'Order booked, waiting for courier pickup',
        dispatchedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.addDelivery(delivery);

      // Update Order Status to Shipped
      db.updateOrder(order.id, {
        status: 'shipped',
        courierProvider: 'steadfast',
        courierConsignmentId: consignmentId,
        courierTrackingCode: trackingCode,
        courierTrackingUrl: trackingUrl,
        courierDispatchedAt: new Date().toISOString(),
      });

      db.logAudit({
        id: `audit_dispatch_${Date.now()}`,
        workspaceId,
        userId: 'system',
        userName: 'Courier Dispatch Engine',
        action: 'ORDER_DISPATCHED',
        details: `Dispatched order ${order.orderNumber} via Steadfast. Tracking: ${trackingCode}`,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        consignmentId,
        trackingCode,
        trackingUrl,
        status: 'pending_pickup',
        message: 'Parcel booked successfully with Steadfast Courier.',
        delivery,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Network failure connecting to Steadfast API: ${err.message}`,
      };
    }
  }

  /**
   * Check status from Steadfast by tracking code
   * Endpoint: GET https://portal.steadfast.com.bd/api/v1/status_by_trackingcode/{tracking_code}
   */
  public static async getSteadfastStatus(
    trackingCode: string,
    workspaceId?: string
  ): Promise<{
    success: boolean;
    trackingCode: string;
    deliveryStatus?: DeliveryStatus;
    rawStatus?: string;
    trackingUrl: string;
    error?: string;
  }> {
    const { apiKey, secretKey, isConfigured } = this.getSteadfastCredentials(workspaceId);
    const trackingUrl = `https://steadfast.com.bd/tracking/${encodeURIComponent(trackingCode)}`;

    if (!isConfigured || !apiKey || !secretKey) {
      return {
        success: false,
        trackingCode,
        trackingUrl,
        error: 'Steadfast API credentials not configured.',
      };
    }

    try {
      const res = await fetch(`https://portal.steadfast.com.bd/api/v1/status_by_trackingcode/${encodeURIComponent(trackingCode)}`, {
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
        },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.status !== 200) {
        return {
          success: false,
          trackingCode,
          trackingUrl,
          error: (data && data.message) || `HTTP error ${res.status} from Steadfast`,
        };
      }

      const rawStatus = (data.delivery_status || data.status || '').toLowerCase();
      let deliveryStatus: DeliveryStatus = 'pending_pickup';

      if (rawStatus.includes('delivered')) deliveryStatus = 'delivered';
      else if (rawStatus.includes('transit') || rawStatus.includes('shipped') || rawStatus.includes('out_for_delivery')) deliveryStatus = 'in_transit';
      else if (rawStatus.includes('cancel') || rawStatus.includes('return')) deliveryStatus = 'returned';
      else if (rawStatus.includes('fail') || rawStatus.includes('hold')) deliveryStatus = 'attempted_failed';

      // Update existing delivery record if present
      const allDeliveries = (db as any).data.deliveries || [];
      const match = allDeliveries.find((d: any) => d.trackingCode === trackingCode);
      if (match) {
        db.updateDelivery(match.id, {
          status: deliveryStatus,
          statusDetails: rawStatus,
          codCollected: deliveryStatus === 'delivered',
          deliveredAt: deliveryStatus === 'delivered' ? (match.deliveredAt || new Date().toISOString()) : undefined,
          lastSyncAt: new Date().toISOString(),
        });

        // Also sync Order status
        if (match.orderId) {
          const ord = db.getOrder(match.orderId);
          if (ord) {
            const nextOrdStatus = deliveryStatus === 'delivered' ? 'delivered'
              : deliveryStatus === 'returned' ? 'returned'
              : deliveryStatus === 'attempted_failed' ? 'delivery_failed'
              : ord.status;

            if (nextOrdStatus !== ord.status) {
              db.updateOrder(match.orderId, {
                status: nextOrdStatus,
                paymentStatus: deliveryStatus === 'delivered' && ord.paymentMethod === 'cash_on_delivery' ? 'paid' : ord.paymentStatus,
              });
            }
          }
        }
      }

      return {
        success: true,
        trackingCode,
        deliveryStatus,
        rawStatus,
        trackingUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        trackingCode,
        trackingUrl,
        error: err.message || 'Failed to fetch status from Steadfast',
      };
    }
  }

  /**
   * Fetch current merchant balance from Steadfast
   * Endpoint: GET https://portal.steadfast.com.bd/api/v1/get_balance
   */
  public static async getSteadfastBalance(workspaceId?: string): Promise<{ success: boolean; currentBalance?: number; error?: string }> {
    const { apiKey, secretKey, isConfigured } = this.getSteadfastCredentials(workspaceId);
    if (!isConfigured || !apiKey || !secretKey) {
      return { success: false, error: 'Steadfast credentials not configured.' };
    }

    try {
      const res = await fetch('https://portal.steadfast.com.bd/api/v1/get_balance', {
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
        },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.status !== 200) {
        return { success: false, error: (data && data.message) || `HTTP ${res.status}` };
      }

      return {
        success: true,
        currentBalance: typeof data.current_balance === 'number' ? data.current_balance : parseFloat(data.current_balance) || 0,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync all pending and in-transit shipments for a workspace
   */
  public static async syncWorkspaceShipments(workspaceId: string): Promise<{ syncedCount: number; errors: string[] }> {
    const deliveries = db.getDeliveries(workspaceId).filter(
      (d) => d.courierProvider === 'steadfast' && (d.status === 'pending_pickup' || d.status === 'in_transit' || d.status === 'attempted_failed')
    );

    let syncedCount = 0;
    const errors: string[] = [];

    for (const d of deliveries) {
      if (!d.trackingCode) continue;
      const res = await this.getSteadfastStatus(d.trackingCode, workspaceId);
      if (res.success) {
        syncedCount++;
      } else if (res.error) {
        errors.push(`${d.trackingCode}: ${res.error}`);
      }
    }

    return { syncedCount, errors };
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
