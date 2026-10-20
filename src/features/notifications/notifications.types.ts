export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  referenceType?: string | null;
  referenceId?: string | null;
  action?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: AppNotification[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
