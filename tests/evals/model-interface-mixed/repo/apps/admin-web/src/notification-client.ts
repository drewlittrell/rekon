export function notificationDeliveryPath(contactId: string): string {
  return `/api/notifications/contacts/${contactId}/deliveries`;
}
