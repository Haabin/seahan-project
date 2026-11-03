import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage(props: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">출고·재고 보드</h1>
      <p className="mt-1 text-sm text-gray-500">새한프라텍 직원 전용. 등록된 계정으로 로그인하세요.</p>
      <Suspense fallback={null}>
        <NextAware searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function NextAware({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/"} />;
}
