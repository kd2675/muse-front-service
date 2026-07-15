# muse-front-service

Muse 사용자용 Next.js 앱입니다. Contest, Gallery, Overview, Profile, 관리자 화면까지 포함한 가장 큰 프론트엔드 앱입니다.

## 역할

- 공개 홈/overview/contest/gallery UI 제공
- 로그인 및 OAuth 진입
- 개인 갤러리(My Museum) 관리
- 콘테스트 상세, 참가, 투표, 랭킹 UI
- 관리자용 contest/gallery 운영 화면 제공
- `image-back-server` 이미지 URL 사용

## 주요 라우트

- `/`
- `/login`
- `/auth/callback`
- `/overview`
- `/contest`
- `/contest/[id]`
- `/contest/[id]/gallery`
- `/gallery`
- `/gallery/my`
- `/gallery/museums/[id]`
- `/profile`
- `/admin/contests`
- `/admin/contests/review`
- `/admin/gallery`

## 실행

```bash
npm install
npm run dev
npm run local
npm run build
npm run start
npm run lint
```

## 포트

- 개발 서버: `3000`
- 프로덕션 시작: `3000`

## 환경 변수

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_IMAGE_BASE_URL=http://localhost:8081
NEXT_PUBLIC_API_LOG_LEVEL=info
```

`npm run dev`는 `.env.dev`, `npm run local`은 `.env.local`을 사용합니다.

## 기술 스택

- Next.js 16.1.6
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4
- React Query
- Redux Toolkit
- Motion
- Swiper

## 연결 서비스

- Gateway: `cloud-back-server`
- Muse API: `muse-back-service`
- 이미지 서버: `image-back-server`

## 인증 메모

- 로그인 페이지는 Gateway 기준 OAuth 경로를 사용합니다.
- OAuth 성공은 `/auth/callback`에서 HttpOnly refresh cookie로 처리하며 URL에 access token을 전달하지 않습니다.
- 확인된 provider ID:
  - `naver-muse`
  - `kakao-muse`
