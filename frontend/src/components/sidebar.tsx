"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType, type SVGProps } from "react";
import { useAuth } from "@/context/auth-context";
import type { Role, User } from "@/types/auth";
import {
  CatalogIcon,
  ClipboardIcon,
  CloseIcon,
  InventoryIcon,
  LogoutIcon,
} from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: Record<Role, NavSection[]> = {
  EMPLOYEE: [
    {
      title: "Requisition",
      items: [{ href: "/equipment", label: "Equipment Catalogue", icon: CatalogIcon }],
    },
  ],
  ADMIN: [
    {
      title: "Approval",
      items: [{ href: "/admin/requests", label: "Requisition Requests", icon: ClipboardIcon }],
    },
    {
      title: "Inventory",
      items: [{ href: "/admin/equipment", label: "Equipment Management", icon: InventoryIcon }],
    },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: "Employee",
  ADMIN: "Administrator",
};

export function Sidebar({
  user,
  open,
  onClose,
}: {
  user: User;
  open: boolean;
  onClose: () => void;
}) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-900 text-slate-300 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* System name */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-brand-700 text-sm font-bold tracking-wider text-white">
            IT
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-white">IT Equipment</p>
            <p className="text-xs leading-tight text-slate-400">Requisition System</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {NAV[user.role].map((section) => (
            <div key={section.title}>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>
              <ul className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                          active
                            ? "border-sky-300 bg-white/10 font-medium text-white"
                            : "border-transparent hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Signed-in user */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <LogoutIcon className="h-4 w-4" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
    </>
  );
}
