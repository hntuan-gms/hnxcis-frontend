# HNX-CIS Frontend

Giao diện **Hệ thống Quản lý Niêm yết, Trái phiếu & Công bố thông tin HNX**.

- React 19 + Vite 6 + TailwindCSS 4 (SPA)
- Build tĩnh và phục vụ bằng **nginx** trên **Cloud Run** (service `hnxcis-frontend`)
- Gọi API của repo `hnxcis-backend` qua `API_BASE_URL` **cấu hình lúc runtime**

---

## 1. Cấu trúc

```
frontend/
├── index.html                # nạp /env.js trước bundle.
├── public/env.js             # cấu hình runtime (bản dev)
├── src/
│   ├── main.tsx, App.tsx
│   ├── components/           # common, layout, modules, portals
│   ├── config/runtime.ts     # đọc window.__APP_CONFIG__ → API_BASE_URL
│   ├── data/mockData.ts      # dữ liệu mẫu (chưa nối DB)
│   ├── lib/apiClient.ts      # fetch wrapper + gắn Firebase ID token
│   ├── lib/firebase.ts       # Firebase Auth (client)
│   ├── services/             # aiService (gọi backend) + business logic phía UI
│   └── types/hnx.ts          # domain types
├── nginx/
│   ├── default.conf.template # listen ${PORT}, SPA fallback, cache header
│   └── 40-generate-env-js.sh # sinh /env.js từ biến môi trường container
├── Dockerfile                # build Vite → nginx:1.27-alpine
└── .github/workflows/        # ci.yml, deploy-cloudrun.yml
```

## 2. Cấu hình runtime (điểm quan trọng)

URL backend **không** được nhúng vào bundle. Mỗi lần container khởi động,
`40-generate-env-js.sh` ghi lại `/env.js`:

```js
window.__APP_CONFIG__ = { API_BASE_URL: "https://hnxcis-backend-xxxx.a.run.app", APP_ENV: "production" };
```

Nhờ vậy khi backend đổi URL chỉ cần:

```bash
gcloud run services update hnxcis-frontend \
  --region asia-southeast1 \
  --set-env-vars API_BASE_URL=https://hnxcis-backend-xxxx.a.run.app
```

không cần build lại image. Trong code luôn dùng `src/lib/apiClient.ts`
(`apiGet` / `apiPost`) hoặc `src/services/aiService.ts` thay vì `fetch` trực tiếp.

## 3. Chạy local

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

Dev server proxy `/api/*` sang `VITE_DEV_API_PROXY` (mặc định `http://localhost:8080`),
nên chạy backend trước là gọi API được ngay, không vướng CORS.

## 4. Build & Docker

```bash
npm run build                                # → dist/
docker build -t hnxcis-frontend .
docker run -p 8080:8080 \
  -e API_BASE_URL=https://hnxcis-backend-xxxx.a.run.app \
  hnxcis-frontend                            # http://localhost:8080
```

nginx expose thêm `/healthz` để Cloud Run / uptime check thăm dò.

## 5. Deploy

Push lên `main` → `.github/workflows/deploy-cloudrun.yml`: typecheck → build image →
push Artifact Registry → `gcloud run deploy` → kiểm tra `/healthz` và `/env.js`.

Cấu hình trong repo (Settings → Secrets and variables → Actions):

**Variables**

| Tên                    | Ví dụ                                    |
| ---------------------- | ---------------------------------------- |
| `GCP_PROJECT_ID`       | `dkquoc-sandbox-cob`                     |
| `GCP_REGION`           | `asia-southeast1`                        |
| `AR_REPOSITORY`        | `hnxcis`                                 |
| `CLOUD_RUN_SERVICE`    | `hnxcis-frontend`                        |
| `CLOUD_RUN_RUNTIME_SA` | `hnxcis-frontend-sa@<project>.iam.gserviceaccount.com` |
| `API_BASE_URL`         | `https://hnxcis-backend-xxxx.a.run.app`  |

**Secrets**

| Tên                              | Mô tả                                            |
| -------------------------------- | ------------------------------------------------ |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider (khuyến nghị)                        |
| `GCP_DEPLOYER_SA`                | Service account deploy dùng cùng WIF              |
| `GCP_SA_KEY`                     | *Chỉ khi không dùng WIF* — JSON key               |

> Sau khi frontend có URL, nhớ cập nhật `CORS_ORIGINS` bên repo backend để
> trình duyệt được phép gọi API.

`firebase-applet-config.json` chứa cấu hình Firebase Web (public theo thiết kế của
Firebase) — quyền truy cập thực tế do Firebase Auth và Security Rules quyết định.
