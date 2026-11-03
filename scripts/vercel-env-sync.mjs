// 로컬 .env 의 DATABASE_URL, DIRECT_URL, SESSION_SECRET 을 Vercel(Production, Preview)에 덮어쓴다.
// 사용: node scripts/vercel-env-sync.mjs   (사전에 npx vercel login, npx vercel link 필요)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const KEYS = ["DATABASE_URL", "DIRECT_URL", "SESSION_SECRET"];
const ENVS = ["production", "preview"];

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"(.*)"$/, "$1")];
    }),
);

for (const k of KEYS) {
  if (!env[k]) {
    console.error(`.env 에 ${k} 가 없습니다.`);
    process.exit(1);
  }
  if (k !== "SESSION_SECRET" && !/^postgresql:\/\/.+@aws-0-.+pooler\.supabase\.com:\d+\/postgres/.test(env[k])) {
    console.error(`${k} 가 Supabase 풀러 접속 문자열 형식이 아닙니다: ${env[k].replace(/:[^@]*@/, ":***@")}`);
    process.exit(1);
  }
  for (const target of ENVS) {
    const r = spawnSync("npx", ["vercel", "env", "add", k, target, "--force"], {
      input: env[k],
      encoding: "utf8",
      shell: true,
    });
    const line = (r.stdout + r.stderr).split("\n").find((l) => /Added|Updated|Error|error/i.test(l)) ?? r.stdout.trim().split("\n").pop();
    console.log(`${k} (${target}): ${line?.trim()}`);
  }
}
console.log("완료. 이제 재배포가 필요합니다: npx vercel --prod --yes");
