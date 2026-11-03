"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

/** 휴대폰 하단 고정 탭바. 역할별 항목은 layout(서버)에서 넘긴다 */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-md">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" || pathname.startsWith("/items") : pathname.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap py-3 text-center text-[13px] ${
                  active ? "font-bold text-blue-700" : "text-gray-500"
                }`}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
