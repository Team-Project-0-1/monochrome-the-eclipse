# 사용자 결정이 필요한 출시 작업

이 문서는 계정 권한, 법적/사업적 판단, 프로덕션 자격 증명이 필요해서 Codex가 임의로 처리하면 안 되는 항목만 모은다.

## 현재 사용자 TODO

- 첫 공개 버전 라벨을 확정한다. 현재 권장값: `Prototype v0.1`.
- 첫 프로덕션 호스트를 정한다.
  - 가장 빠른 공개: GitHub Pages.
  - 실제 트래픽과 장기 운영 권장: Cloudflare Pages + 커스텀 도메인.
  - 보안/캐시 헤더 적용 필요 시 GitHub Pages 단독은 부족하다. `public/_headers`를 적용할 수 있는 Cloudflare Pages/Netlify 또는 CDN 프록시를 선택한다.
- 3스테이지가 플레이 가능한 프로토타입 범위로 충분한지 첫 공개 빌드 기준을 결정한다.
- 생성 이미지/오디오의 출처와 사용권을 검토하고, 현재 에셋을 프로토타입 공개 범위에서 허용할지 결정한다.
- 호스팅 결정 후 GitHub Pages 워크플로를 실행하거나 Cloudflare/domain 접근 권한을 제공한다.

## 공개 URL 발표 전 반드시 결정할 것

- 정식 공개 URL.
  - 옵션 A: GitHub Pages fallback, 예상 URL `https://team-project-0-1.github.io/monocrome-eclips/`.
  - 옵션 B: Cloudflare Pages/custom domain, 실제 공개 트래픽에는 권장.
- 첫 공개 라벨: prototype, alpha, early access, full release 중 하나.
- 3스테이지 밸런스와 생성 몬스터/배경 에셋의 상업 사용권/최종 승인 미완료를 공개 빌드의 알려진 제한으로 표기할지 여부.

## Cloudflare 설정 전 필요한 것

- Cloudflare 계정 접근 또는 위임된 프로젝트 접근 권한.
- 사용할 도메인 이름.
- 네임서버 또는 CNAME 설정을 위한 DNS 접근 권한.
- canonical redirect 정책.
  - root domain -> `www`
  - `www` -> root domain
  - 기본 호스팅 도메인 -> 커스텀 도메인

## 분석/텔레메트리 전 필요한 것

- GA4 측정 ID 또는 대체 분석 도구.
- 분석 사용에 대한 개인정보 안내 문구.
- 분석이 opt-in, opt-out, 일반 익명 텔레메트리 중 어느 방식인지 결정.
- 추적 허용 이벤트.
  - game start
  - run start/end
  - combat win/loss
  - shop purchase
  - event choice
  - reward choice
  - error/fatal state

## 더 넓은 공개 마케팅 전 검토할 것

- 생성 이미지와 오디오 에셋의 권리/출처.
- 상업 사용 전에 교체해야 할 임시 생성 에셋이 있는지 여부.
- 게임 제목과 시각 정체성의 소유권.
- 공개 지원/문의 채널.
- 필요 시 콘텐츠 경고 또는 연령 등급 문구.
- 분석이나 계정 기능을 붙일 경우 약관/개인정보 페이지.

## 첫 트래픽 이후 확인할 것

- Cloudflare cache hit rate와 origin bandwidth.
- 상위 20개 요청 에셋과 404.
- 모바일 뷰포트 오류 보고.
- 첫 런 완료율과 전투 패배 지점.
- 다음 패치 우선순위가 밸런스, 온보딩, 에셋 교체 중 어디인지 결정.
