# Báo cáo phân tích kỹ thuật & Kế hoạch 1:1 (Bản tiếng Việt)

**Ngày:** 2025-12-03

**Mục tiêu:** Phân tích trang https://cme-trading.online, thu thập bằng chứng kỹ thuật (DOM, API, assets), xác định phạm vi và kế hoạch thực hiện 1:1 clone (UI/UX + API/behaviour + performance & SEO).

---

## 1) Tóm tắt nhanh
- Ứng dụng là Single Page App (SPA), tải một bundle JS lớn: `/static/js/main.4c2c0360.js?v=1.0.0` (~1.7MB). CSS chính: `/static/css/main.c455ed8c.css`.
- Có trang chính ("/"), trang mobile (“/m”) và trang giao dịch ("/board").
- Phát hiện endpoints quan trọng và hành vi đăng nhập (read-only) đã được xác nhận bằng thông tin từ `debug_requests.json` và `debug_responses.json`.
- Kết luận: có thể sao chép UI/UX cơ bản; cần phân tích JS bundle sâu hơn để xác định liệu có web socket hay tích hợp chart/thư viện bên thứ ba.

---

## 2) Phạm vi & phương pháp
- Dùng trình duyệt headless tự động (cấu hình viewport theo desktop/mobile/tablet) để:
  - chụp ảnh màn hình (screenshot) các trang (desktop/tablet/mobile);
  - lưu DOM hiện tại;
  - lưu network requests và responses để trích xuất API endpoints;
  - chạy audit Lighthouse (lưu JSON - `lighthouse_report.json`).
- Credential (đăng nhập) do bạn cung cấp: `0976854137 / Abcd@2024` — được dùng cho login thử nghiệm (read-only).
- Tất cả thao tác là read-only; không thực hiện giao dịch.

---

## 3) Các phát hiện chính (Key findings)
### 3.1 API & xác thực
- `POST https://api.cmetradingvn.net/api/device/init` — trả về `trading_view`, `top_coin`, `banners`, `languages`, `coins`.
  - Gợi ý: `trading_view` -> https://trading.ungdung79.com (thể hiện 1 ứng dụng trading/chi tiết chart riêng).
- `POST https://api.cmetradingvn.net/api/auth/login` — endpoint xác thực, `success: true` trả về đối tượng `user` và danh sách `tokens`.
- `GET https://api.cmetradingvn.net/api/auth/profile` — endpoint trả profile sau khi login.
- `GET https://api.trading.ungdung79.com/api/price/list?limit=10&page=1` — trả giá thị trường (price list) — có thể là REST polling.

### 3.2 Assets / Font / Màu
- Font: Google Mulish (các tệp woff2 tải từ Google Fonts).
- Pallete chính: `#f7a600` (accent), `#3D5AFE` / `#2C04FE` (primary), nền tối `#13111A`, `#121212`, `#26242c`. Ứng dụng sử dụng dark theme (`<html class="dark">`).
- CDN: nhiều asset tải từ `api.demo92.apptestlive.com` và `api.cmetrading.com`.

### 3.3 Giao diện & trải nghiệm
- Header, Hero, tính năng, carousel testimonails, FAQ, Footer (landing).
- Trang `/board` có cấu trúc trading board: left = market list; center = chart; right = orderbook, trade form.
- UI tương thích responsive (có route `/m` cho mobile).

### 3.4 Chart/Realtime
- `device/init` trả `trading_view`, ám chỉ chart/logic bàn giao dịch có thể nằm tại `trading.ungdung79.com` hoặc được nhúng.
- Trong capture hiện tại chưa thấy request WebSocket (wss://) — có thể: (A) chart chạy trên domain `trading.ungdung79.com` (embed/iframe), hoặc (B) REST polling (có `price/list` endpoint). Cần phân tích JS bundle sâu để xác nhận.

---

## 4) Mẫu request/response (đã thu thập)
- device/init (POST)
```bash
curl -X POST "https://api.cmetradingvn.net/api/device/init" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- auth/login (POST)
```bash
curl -X POST "https://api.cmetradingvn.net/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0976854137","password":"Abcd@2024"}'
```
- Trích mẫu response (tóm tắt):
  - `success: true`
  - `data.user`: { id, username, phone }
  - `data.tokens`: danh sách token (BTC/USDC/ETH …)

> Lưu ý: Mình đã thu thập `debug_responses.json` (có bản đầy đủ). Không lưu mật khẩu thô vào repo.

---

## 5) Kết quả Lighthouse & Performance (tổng hợp)
- Performance: 29% (FCP 3.3s, LCP 13.9s, TBT 722 ms, CLS 0.5)
- Accessibility: 75%
- Best Practices: 93%
- SEO: 100%

### 5.1 Vấn đề chính
- Tải JS bundle lớn (ảnh hưởng LCP & TBT): cần code-splitting, lazy-load chart & widgets.
- LCP lớn — tài nguyên quan trọng (hero, chart) tải chậm; recommend SSR cho trang landing & skeleton trên board.
- CLS: vị trí layout shift cần kiểm soát (kích thước ảnh/iframe/fallback placeholder).

### 5.2 Khuyến nghị nhanh
- Dùng SSR (Next.js) hoặc pre-render cho trang chính để cải thiện LCP.
- Chia tách JS bundle; chỉ tải chart code khi vào `/board`.
- Lazy load / defer third-party and heavy scripts.
- Sử dụng next-gen formats & responsive images; set width/height cho images/iframes.

---

## 6) Kiến trúc & Stack khuyến nghị để sao chép 1:1
- Frontend: Next.js (TypeScript) + Tailwind CSS, dynamic import cho chart; Headless UI cho hỗ trợ a11y.
- Chart: TradingView Charting Library (nếu cần 1:1 và có license) hoặc `lightweight-charts` (open-source).
- State management: React Query (data fetching), Zustand / Redux toolkit.
- Backend: NestJS/Express (TypeScript), Postgres (user/wallet), Redis (cache/pubsub/session), Socket server (WS / socket.io) cho realtime.
- Deploy: Docker + Kubernetes; CDN (Cloudflare) cho static; TLS/HTTPS + HSTS.
- Observability: Sentry & Prometheus/Grafana.

---

## 7) Kế hoạch triển khai (MVP có thể hoạt động cơ bản)
**Phase 0 — Discovery & design** (1 tuần)
- Thiết kế token (color/fonts), mapping UI/UX components.

**Phase 1 — Setup & auth** (1 tuần)
- Setup Next.js skeleton + login flow + device/init referenced.

**Phase 2 — Landing & Board shell** (2 tuần)
- Implement header/footer, hero, boardshell (market list & chart placeholder).

**Phase 3 — Integrate chart & mock feed** (2 tuần)
- Add chart library, build orderbook, trade form (mock mode).

**Phase 4 — Backend & Realtime** (3-4 tuần)
- Build user/wallet/price endpoints; Realtime (WebSocket or pubsub). Mock matching engine (MVP).

**Phase 5 — QA & performance** (2 tuần)
- Accessibility & Lighthouse improvements, load testing.

**Rough estimate MVP**: 10–14 tuần (4 dev + 1 designer + QA)

---

## 8) Bảo mật, Pháp lý & Rủi ro
- **Thương hiệu**: Mô tả và logo có nhắc đến “CME Group/TOCOM” — không tái sử dụng trực tiếp (xác minh bản quyền & quyền sử dụng thương hiệu).
- **Giao dịch và tiền ảo**: cần thực hiện KYC/AML tùy theo lãnh thổ; nếu cung cấp môi trường giao dịch thực, cần giấy phép.
- **Dữ liệu cá nhân**: xử lý an toàn (encrypted persistence), tuân thủ luật (GDPR/PDPA...)

---

## 9) Next Steps (tùy bạn chọn)
1. Muốn mình scaffold Next.js sample (skeleton + authentication + basic board UI)?
2. Muốn phân tích sâu `main.4c2c0360.js` để tìm WebSocket, Chart libs, hay 3rd-party analytics?
3. Xuất báo cáo PDF & đính kèm các ảnh chụp/DOM?

---

## 10) File tham chiếu (bằng chứng) — xem trong workspace
- `captures/network_requests.json`
- `captures/debug_requests.json`
- `captures/debug_responses.json`
- `captures/dom_home_desktop.html` `captures/dom_board_desktop.html` `captures/dom_home_mobile.html` …
- `captures/home_desktop_1920x1080.png`, `captures/board_desktop_1920x1080.png`, `captures/home_mobile_375x667.png`
- `lighthouse_report.json`

---

## 11) Phụ lục (ứng dụng truy vấn & mẫu command)
- Đăng nhập:
```bash
curl -X POST "https://api.cmetradingvn.net/api/auth/login" \
 -H "Content-Type: application/json" \
 -d '{"phone":"0976854137","password":"Abcd@2024"}'
```
- Trích xuất device init:
```bash
curl -X POST "https://api.cmetradingvn.net/api/device/init" -H "Content-Type: application/json" -d '{}'
```

---

Nếu bạn muốn mình: (A) xuất sang PDF, (B) generate scaffolding code, hoặc (C) điều tra JavaScript bundle để tìm socket/chart libs, trả lời mục bạn cần và mình sẽ tiếp tục.
