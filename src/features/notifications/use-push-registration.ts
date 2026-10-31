import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { registerForPush } from './push-registration';

/** Đăng ký push sau khi đăng nhập và mở màn thông báo khi người dùng chạm vào push. */
export function usePushRegistration() {
  const router = useRouter();

  useEffect(() => {
    registerForPush().catch(() => undefined);
  }, []);

  useEffect(() => {
    const open = () => router.push('/notifications');
    const last = Notifications.getLastNotificationResponse();
    if (last) open();
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);
}
