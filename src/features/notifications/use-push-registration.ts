import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { getPushNotifications, registerForPush } from './push-registration';
import { logger } from '@/lib/logger';

/** Đăng ký push sau khi đăng nhập và mở màn thông báo khi người dùng chạm vào push. */
export function usePushRegistration() {
  const router = useRouter();

  useEffect(() => {
    registerForPush().catch(() => logger.warn('Chưa đăng ký được thông báo đẩy.'));
  }, []);

  useEffect(() => {
    let active = true;
    let subscription: { remove: () => void } | undefined;
    void getPushNotifications().then(Notifications => {
      if (!active || !Notifications) return;
      const open = () => { if (active) router.push('/notifications'); };
      const last = Notifications.getLastNotificationResponse();
      if (last) open();
      subscription = Notifications.addNotificationResponseReceivedListener(open);
    }).catch(() => logger.warn('Chưa khởi tạo được xử lý thông báo đẩy.'));
    return () => { active = false; subscription?.remove(); };
  }, [router]);
}
