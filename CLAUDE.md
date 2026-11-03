# 새한프라텍 출고·재고 보드

이 파일은 저장소 루트에 두는 Claude Code용 프로젝트 규칙이다. 모든 작업 전에 읽고 따른다.
요구사항의 원본은 `docs/requirements.md`(요구사항 정의서 v0.3)이며, 이 파일과 다르면 정의서가 우선한다.

## 1. 프로젝트 한 줄 요약

외근 영업사원이 사내 직원에게 전화하지 않고, 휴대폰으로 **출고 가능 재고**와 **추가 생산 예정**을 직접 확인하는 웹 서비스.
ERP(MOLD)를 교체하지 않는다. ERP 데이터를 **읽기만** 하고, 그 위에 보정·계획·메모를 얹는다.

## 2. 사용자

| 역할 | 기기 | 주로 하는 일 |
| --- | --- | --- |
| 영업팀 (조회 사용자) | 휴대폰 브라우저 | 재고·생산 예정 조회, 상담 메모 작성 |
| 생산지원팀 (보정 담당) | 사무실 PC | 불량·변동 입력, 생산 계획·공정 입력, 고객 요청 확인 |
| 운영 관리자 | PC | 계정·권한 관리, 연동 상태 확인 |

사용자 대부분은 IT 활용 수준이 초급이다. **교육 없이 쓸 수 있는 화면**이 최우선 기준이다.

## 3. 핵심 도메인 규칙 (반드시 지킬 것)

1. **출고 가능 수량** = ERP 재고 − 적용 중인 변동(불량, 보류, 출고 예정, 기타)의 합. 0 미만이면 0으로 표시하고 경고한다.
2. 변동은 `적용 중 / 해제됨` 상태를 가진다. 해제된 변동은 계산에서 빠지지만 기록은 지우지 않는다.
3. 모든 화면 상단에 **데이터 기준 시각**을 보여준다. 마지막 연동이 예정 주기(기본 15분)의 2배보다 오래되면 "데이터가 오래됨" 경고를 띄운다. 틀린 숫자를 조용히 보여주지 않는다.
4. 생산 계획·공정 단계는 생산지원팀이 등록한 값이다. 날짜는 항상 **"예정"**으로 표시하고 마지막 수정 시각을 함께 보여준다.
5. ERP에는 절대 쓰지 않는다. 연동 계정은 읽기 전용이다.
6. 사업장(음성·청주) 구분은 데이터에 항상 둔다. 화면 필터는 설정으로 켜고 끈다(정의서 Q2 미확정).
7. 상담 메모의 고객 정보는 영업팀·생산지원팀만 볼 수 있다. 수정·삭제 이력을 남긴다.

## 4. 아직 확정되지 않은 것 (정의서 9장)

- **Q1 ERP 데이터 추출 방식**: 미정. 그래서 ERP 연동은 반드시 `ErpSource` 인터페이스 뒤에 숨긴다. 구현체는 `CsvFileSource`(엑셀/CSV 파일), `DbSource`(DB 직접 조회, 나중에), `MockSource`(샘플 데이터) 순으로 만든다.
- **Q5 서버 위치**: 개발팀 결정으로 **클라우드(Vercel + Supabase)** 를 기본으로 한다. 기업이 사내 서버를 요구하면 그때 Docker 구성을 추가한다.
- **Q3, Q4, Q12** 등 세부 규칙: 미정 항목은 설정값이나 상수로 두고 코드 주석에 `TODO(Q번호)`를 단다.

## 5. 기술 스택 (변경 시 이 파일부터 수정)

- 웹: Next.js (App Router) + TypeScript + Tailwind CSS, 모바일 우선 반응형
- DB: **Supabase PostgreSQL** + Prisma. 개발·운영 모두 Supabase 프로젝트를 쓴다(로컬 DB·Docker 없음).
  - `.env`의 `DATABASE_URL`(Supabase 커넥션 풀러, 6543 포트, `pgbouncer=true`)과 `DIRECT_URL`(5432, 마이그레이션용)을 Prisma `datasource`에 둘 다 지정한다.
- 인증: 아이디/비밀번호 로그인(세션 쿠키), 역할 기반 권한(viewer / editor / admin). Supabase Auth는 쓰지 않는다.
- 연동 에이전트: `agent/` 폴더의 독립 Node.js 스크립트. 사내 PC나 서버에서 상시 실행되며 ERP 데이터를 읽어 Vercel에 배포된 서버 API로 HTTPS 전송한다. Windows 서비스로 등록 가능해야 한다.
- 예약 작업: 연동 지연 감시와 연동 실패 알림(FR-10)은 **Vercel Cron**(`vercel.json`)으로 API 라우트를 주기 호출한다.
- 배포: **Vercel**(web) + **Supabase**(db). GitHub 저장소를 Vercel에 연결해 `main` 푸시 시 자동 배포한다.
- 테스트: Vitest(단위), Playwright(주요 화면 흐름)

## 6. 폴더 구조

```
docs/            요구사항 정의서, 개발 계획, 운영 매뉴얼, 인수인계서
docs/sample/     기업 제공 실적 데이터(2021~2025 생산·판매 실적, 참고용. git에 올리지 않음)
prisma/          스키마, 마이그레이션, 샘플 시드
src/app/         화면과 API 라우트
src/lib/domain/  출고 가능 수량 계산 등 순수 도메인 로직 (테스트 필수)
src/lib/erp/     ErpSource 인터페이스와 구현체
agent/           사내 연동 에이전트
tests/           단위·E2E 테스트
```

### 6.1 docs/sample/ 데이터에 대해

- 기업이 준 파일은 **ERP 재고 스냅샷이나 기존 데모 코드가 아니라** 5년치(2021~2025) 생산실적·판매실적 이력이다. 확장자는 `.xls`지만 실제로는 **CP949 인코딩 탭 구분 텍스트**다.
- 품번·품종·품명/규격·포장단위·용량·거래선은 이 데이터에서 그대로 뽑아 품목·거래선 마스터와 시드로 쓴다.
- 재고 수량, 사업장, 변동, 생산 계획처럼 데이터에 없는 값은 **임의로 만든 참고용 데이터**이며, 시드 파일과 화면(시드 데이터일 때)에 "참고용 임의 데이터"임을 표기한다.

## 7. 작업 방식

- 큰 작업은 먼저 계획을 보여주고 승인을 받은 뒤 코드를 쓴다.
- 기능을 만들 때마다 정의서의 FR/NFR 번호를 커밋 메시지와 PR 설명에 적는다.
- 각 FR의 "완료 기준"을 테스트로 옮긴다. 테스트가 통과해야 완료다.
- 화면 문구는 모두 한국어. 버튼·라벨은 짧고 쉬운 말로 쓴다.
- 비밀번호, 토큰, DB 접속 정보는 코드에 넣지 않고 `.env`로 관리하며 `.env.example`만 커밋한다.
- 기능을 추가하거나 바꾸면 `docs/운영매뉴얼.md`와 `docs/인수인계서.md`의 해당 부분도 함께 고친다.

## 8. 자주 쓰는 명령

```
npm run dev              개발 서버 (http://localhost:3000)
npm test                 단위 테스트 (Vitest, DB 불필요)
npm run test:e2e         화면 테스트 (Playwright, 2단계부터)
npm run typecheck        tsc --noEmit
npm run lint             eslint
npm run db:generate      Prisma Client 생성 (prisma/generated, git 제외)
npm run db:migrate       스키마 변경을 Supabase에 반영 (DIRECT_URL, prisma migrate dev)
npm run db:deploy        운영 DB에 마이그레이션 적용 (prisma migrate deploy)
npm run db:seed          샘플 데이터 넣기 (참고용 임의 데이터, 여러 번 실행해도 중복 없음)
npm run db:extract       docs/sample 실적 파일에서 prisma/seed-data/*.json 다시 뽑기
npm run db:studio        Prisma Studio로 데이터 보기
```
- 로그인 시드 계정: admin / editor / viewer (비밀번호는 .env의 SEED_*_PASSWORD, 기본 test1234)
- Next.js 16: params·searchParams·cookies()는 모두 await 필요, middleware 대신 proxy.ts 사용. 자세한 것은 node_modules/next/dist/docs/
- Prisma 7: 접속 정보는 schema.prisma가 아니라 prisma.config.ts(DIRECT_URL)와 src/lib/db.ts(DATABASE_URL)에 있다
