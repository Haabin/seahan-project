# 새한프라텍 출고·재고 보드

외근 영업사원이 휴대폰으로 **출고 가능 재고**와 **추가 생산 예정**을 직접 확인하는 웹 서비스.
요구사항은 `docs/requirements.md`, 개발 규칙은 `CLAUDE.md`, 단계별 진행은 `docs/개발계획.md`를 본다.

## 시작하기

```bash
npm install
cp .env.example .env     # Supabase 접속 정보(DATABASE_URL, DIRECT_URL) 입력
npm run db:migrate       # 테이블 생성
npm run db:seed          # 샘플 데이터 (참고용 임의 데이터)
npm run dev              # http://localhost:3000
```

시드 계정: `admin` / `editor` / `viewer` (비밀번호 기본 `test1234`, `.env`의 `SEED_*_PASSWORD`로 변경)

## 기술 스택

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 · Supabase PostgreSQL · Vercel · Vitest · Playwright

## 폴더

```
docs/            요구사항 정의서, 개발 계획, 운영 문서
docs/sample/     기업 제공 실적 데이터 설명 (원본 .xls는 git 제외)
prisma/          schema.prisma, migrations, seed.ts, seed-data/
src/app/         화면·API 라우트
src/lib/domain/  출고 가능 수량 계산 등 순수 로직 (tests/unit)
src/lib/erp/     ERP 연동 소스 (4단계)
agent/           사내 연동 에이전트 (4단계)
tests/           단위·E2E 테스트
```
