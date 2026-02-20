import { TrackingStatus } from '@prisma/client';

export function getTrackingPushContent(
    orderNumber: string,
    customerName: string | null | undefined,
    status: TrackingStatus,
) {

    const TrackingStatusLabel: Record<TrackingStatus, string> = {
        order_placed: 'Order Placed',
        processing: 'Being Prepared',
        ready_to_ship: 'Packed & Ready',
        shipped: 'Shipped',
        in_transit: 'On the Way',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered',
        failed_delivery: 'Delivery Attempt Failed',
        return_processing: 'Return in Progress',
        returned: 'Returned',
    };

    const name = customerName ?? 'Customer';

    let title = '📦 Order Update';
    let body = `Hi ${name}, your order #${orderNumber} is now ${TrackingStatusLabel[status]}.`;

    switch (status) {

        case 'processing':
            title = '👨‍🍳 Preparing Your Order';
            body = `We're getting your order #${orderNumber} ready.`;
            break;

        case 'ready_to_ship':
            title = '📦 Packed & Ready';
            body = `Your order #${orderNumber} has been packed and will be shipped soon.`;
            break;

        case 'shipped':
        case 'in_transit':
            title = '🚚 On the Way';
            body = `Your order #${orderNumber} is on its way to your delivery location.`;
            break;

        case 'out_for_delivery':
            title = '🛵 Out for Delivery';
            body = `Your order #${orderNumber} will reach you shortly. Please keep your phone accessible.`;
            break;

        case 'delivered':
            title = '✅ Delivered';
            body = `Your order #${orderNumber} has been delivered successfully. Enjoy!`;
            break;

        case 'failed_delivery':
            title = '⚠️ Delivery Attempt Failed';
            body = `We couldn't deliver your order #${orderNumber}. We'll try again soon.`;
            break;

        case 'return_processing':
            title = '🔄 Return in Progress';
            body = `Return process for order #${orderNumber} has been initiated.`;
            break;

        case 'returned':
            title = '📦 Order Returned';
            body = `Your order #${orderNumber} has been returned successfully.`;
            break;
    }

    return { title, body };
}