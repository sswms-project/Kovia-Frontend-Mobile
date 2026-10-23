import { ApiError } from './api';

export interface RecordSearchCursor { page: number; feed?: string }
interface SearchPage<T> { items: readonly T[]; pageNumber: number; pageSize: number; totalCount: number }
export async function findPagedRecord<T>(load: (page: number) => Promise<SearchPage<T>>, matches: (item: T) => boolean,
  cursor: RecordSearchCursor = { page: 1 }, signal?: AbortSignal): Promise<T | null> {
  for (let requested = 0; requested < 20; requested++) {
    if (signal?.aborted) throw new Error('Đã dừng tìm chứng từ.');
    const page = await load(cursor.page);
    if (page.pageNumber !== cursor.page || page.pageSize <= 0 || page.items.length > page.pageSize)
      throw new ApiError('Phân trang chứng từ đã thay đổi. Vui lòng tải lại.', 409);
    const item = page.items.find(matches);
    if (item) { cursor.page = 1; return item; }
    if (page.pageNumber * page.pageSize >= page.totalCount) { cursor.page = 1; return null; }
    if (!page.items.length) { cursor.page = 1; throw new ApiError('Danh sách vừa thay đổi. Vui lòng tìm lại.', 409); }
    cursor.page++;
  }
  throw new ApiError(`Chưa tìm thấy trong phần đã tải. Bấm Thử lại để tìm tiếp từ trang ${cursor.page}; có thể quay lại bất cứ lúc nào.`, 422);
}
