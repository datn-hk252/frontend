import { redirect } from "next/navigation";

/**
 * Trang gốc "/".
 *
 * Trước đây "/" là trang giới thiệu câu lạc bộ trong nhóm route (landing).
 * Nhóm đó đã chuyển vào _parked/, nên nếu không có tệp này thì "/" trả 404.
 *
 * Chuyển hướng sang /lms. Middleware canh /lms: chưa đăng nhập thì đẩy tiếp
 * sang /login kèm callbackUrl, đăng nhập rồi thì vào màn chọn vai trò.
 */
export default function RootPage() {
  redirect("/lms");
}
