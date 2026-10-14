# Kovia Mobile (SSWMS)

Mobile client của hệ thống quản lý kho SSWMS (Expo SDK 57 / React Native / TypeScript). Dành cho nhân viên kho dùng tại hiện trường: đăng nhập, quét mã, nhập/xuất/kiểm kê. Backend là `SSWMS-Backend` (ASP.NET Core CQRS, REST/JSON); web tương ứng là `SSWMS-Frontend` (React). Ưu tiên mobile-first, hiệu năng, hoạt động ổn khi mạng yếu.

Coding rules chi tiết: `.rules`. File này mô tả kiến trúc, lệnh và quy trình.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Package manager của repo này là **npm** (`package-lock.json`). Không trộn yarn/pnpm/bun.

```bash
npx expo install <package>  # ALWAYS use instead of npm add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo start --dev-client # chạy với development build (cần cho expo-camera, expo-sqlite)
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done. Lỗi có sẵn từ template (`*.css` type declarations, `use-color-scheme.web.ts`) không phải do task của bạn — đừng sửa lan man, chỉ báo lại.

## Architecture

```
src/
├── app/             # Expo Router: CHỈ route files + _layout (thin shells)
│   ├── (auth)/      # màn hình khi chưa đăng nhập
│   └── (app)/       # màn hình sau đăng nhập (tabs, stack)
├── features/<feature>/
│   ├── <feature>.api.ts      # wrapper gọi API (plain object)
│   ├── <feature>.store.ts    # zustand (client state)
│   ├── <feature>.schema.ts   # zod schemas
│   ├── <feature>.types.ts
│   ├── hooks/                # TanStack Query hooks
│   └── components/           # UI riêng của feature
├── components/ui/   # primitives dùng chung
├── lib/             # api client, token storage, logger, hạ tầng
├── providers/       # QueryProvider, ...
├── hooks/ constants/
```

- Feature-first: code của tính năng nằm trong `src/features/<feature>/`. Chỉ đưa ra `components/`, `hooks/`, `lib/` khi có lần dùng thứ hai thực sự.
- `src/app/` không chứa logic nghiệp vụ hay component lớn — route file chỉ ghép hook + component. Alias import: `@/*` → `src/*`.
- Màn hình (route) sở hữu hook gọi API; component con là presentational, nhận data/callback qua props.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/`; `_layout.tsx` defines navigators. Import `Link`, `router`, `useLocalSearchParams` from `expo-router`.
- Auth gate dùng `Stack.Protected` trong `src/app/_layout.tsx` theo `useAuth().signedIn`. Không điều hướng thủ công để chặn route.
- Docs: https://docs.expo.dev/router/introduction.md

## Data, auth & API

- Mọi request qua `api` trong `src/lib/api.ts` (axios + Bearer + refresh 401 một lần, single-flight). Không tạo axios instance khác, không gọi `fetch` thẳng tới backend.
- Backend bọc response trong `ApiResponse<T>` — dùng `unwrap`. Lỗi được chuẩn hoá thành `ApiError` (`message`, `statusCode`).
- Base URL từ `EXPO_PUBLIC_API_URL` (`.env`, không commit; mẫu ở `.env.example`). Android emulator dùng `http://10.0.2.2:7070`; thiết bị thật dùng IP LAN của máy chạy backend. Biến `EXPO_PUBLIC_*` bị nhúng vào bundle — **không bao giờ** để secret.
- Token chỉ lưu trong `expo-secure-store` qua `src/lib/token-storage.ts`. Không dùng AsyncStorage/MMKV/log token.
- Server state → TanStack Query (query key dạng mảng `['resource', params]`). Client state (auth, UI flags) → zustand. Không lưu dữ liệu server vào zustand.
- Form: react-hook-form + zod. Schema bám sát BE Command/Validator tương ứng (đọc `SSWMS-Backend` trước khi viết): tên field đúng nguyên văn camelCase, mỗi rule `NotEmpty/MaximumLength/...` có rule zod tương đương, không gửi field thừa, Create và Update tách schema nếu command khác nhau.
- Phân quyền: backend là nguồn sự thật. Mobile chỉ ẩn/hiện UI theo permission code (tập trung ở một file config, không hard-code chuỗi quyền trong component) — backend vẫn kiểm tra lại.
- Đăng nhập BE có 2FA và captcha; hiện mobile chưa hỗ trợ (login báo lỗi khi `requires2FA`).

## Warehouse-specific

- Quét mã bằng `expo-camera` (barcode). Chống quét trùng liên tiếp (debounce/khoá tới khi xử lý xong) và có haptic/âm báo.
- Nhân viên kho hay mất mạng: thao tác ghi cần xử lý lỗi mạng rõ ràng; nếu làm offline thì dùng `expo-sqlite` + hàng đợi đồng bộ có idempotency, không tự ý thiết kế ngầm.
- Realtime/thông báo dùng `@microsoft/signalr`; luôn dọn kết nối khi unmount/đăng xuất.
- Danh sách dài dùng `FlatList`/`FlashList` với `keyExtractor`, tránh `ScrollView` + `map`.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `npx eas-cli@latest <command>`.
Docs: https://docs.expo.dev/eas/index.md

## Native rules

- `ios/` và `android/` được sinh tự động (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go chỉ có sẵn một số native module. `expo-camera`, `expo-sqlite`, ... cần **development build**: `npx expo run:android` (local) hoặc `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries; kiểm tra thư viện có tương thích SDK trước khi thêm. Docs: https://docs.expo.dev/versions/latest/index.md

## Git workflow

Mirror theo web (`SSWMS-Frontend/docs/GIT_WORKFLOW.md`):

- Không code trực tiếp trên `dev`/`main`. Mỗi feature/fix/refactor một branch, tạo từ `origin/dev` mới nhất:

```bash
git fetch origin dev
git switch -c <type>/wms-<number>-<short-description> origin/dev
```

- Type: `feat`, `fix`, `ui`, `docs`, `refactor`, `test`, `chore`.
- Chỉ commit file liên quan task; kiểm tra `git status` trước khi commit. Không commit `.env`, keystore, credentials.
- Mở PR vào `dev`; leader promote lên `main` (squash merge). Chỉ commit/push khi người dùng yêu cầu.
