# muse-front-service

Muse 사용자용 Next.js 앱입니다. Contest, Gallery, Overview, Profile, 관리자 화면까지 포함한 가장 큰 프론트엔드 앱입니다.

제품의 중심은 단순 공모전 목록이 아니라 `발견 -> 출품/투표 -> 결과 기록 -> 작가 영구 전시`로 이어지는 사진 아카이브입니다. 공개 UI는 한밤의 대형 미술관 로비, 종이빛 텍스트, 절제된 황동색 안내 체계를 기반으로 작품을 가장 먼저 보이게 구성합니다. PC에서는 넓은 작품 무대와 상단 전시 안내를, 모바일에서는 첫 화면의 입장 행동과 하단 관람 동선을 우선합니다.

## 역할

- 공개 홈/overview/contest/gallery UI 제공
- 아이디 로그인/회원가입 및 OAuth 진입
- 개인 갤러리(My Museum) 관리
- 콘테스트 상세, 출품 초안 자동 저장, 결제, 참가, 투표, 랭킹, 수상 결과 UI
- 통합 탐색, 공개 작가/팔로우, 알림, 북마크와 관람 기록
- 전시 큐레이션 스튜디오, 예약 공개, 음성 해설, 인쇄용 도록과 QR
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
- `/contest/[id]/results`
- `/contest/[id]/payment/success`
- `/contest/[id]/payment/fail`
- `/gallery`
- `/gallery/my`
- `/gallery/my/[id]/curate`
- `/gallery/museums/[id]`
- `/gallery/museums/[id]/catalog`
- `/search`
- `/artists/[id]`
- `/library`
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
NEXT_PUBLIC_MUSE_EXHIBIT_LAB=false
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`npm run dev`는 `.env.dev`, `npm run local`은 `.env.local`을 사용합니다.

## 기술 스택

- Next.js 16.3.0
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4
- React Query
- Redux Toolkit
- Motion
- Swiper
- Toss Payments Payment Widget v2
- QRCode

## 연결 서비스

- Gateway: `cloud-back-server`
- Muse API: `muse-back-service`
- 이미지 서버: `image-back-server`

## 인증 메모

- 로그인 페이지는 Gateway 기준 OAuth 경로를 사용합니다.
- 아이디 로그인은 `/auth/login`, USER 회원가입은 `/api/users`를 사용하고 성공 시 Muse 프로필을 초기화합니다.
- OAuth 성공은 `/auth/callback`에서 HttpOnly refresh cookie로 처리하며 URL에 access token을 전달하지 않습니다.
- 보호 화면에서 전달된 검증된 `next` 내부 경로는 로그인 방식과 무관하게 인증 후 복원합니다.
- 확인된 provider ID:
  - `naver-muse`
  - `kakao-muse`
