"use client";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
  key: string;
  iconPath: string;
  ariaLabel: string;
};

const defaultItems: NavItem[] = [
  { key: "home", iconPath: "/icon/home.svg", ariaLabel: "Home" },
  { key: "social", iconPath: "/icon/message-circle.svg", ariaLabel: "Social" },
  { key: "journal", iconPath: "/icon/book-open.svg", ariaLabel: "Journal" },
  { key: "profile", iconPath: "/icon/user.svg", ariaLabel: "Profile" },
];

interface BottomNavProps {
  activeIndex?: number;
  onChange?: (index: number, key: string) => void;
  items?: NavItem[];
  className?: string;
}

export function BottomNav({
  activeIndex = 0,
  onChange,
  items = defaultItems,
  className,
}: BottomNavProps) {
  return (
    <div
      className={cn("fixed inset-x-0 bottom-0 z-40", className)}
      aria-label="Bottom navigation"
    >
      <div className="relative w-full">
        <div className="relative w-full rounded-t-3xl bg-white shadow-[0_-2px_16px_rgba(0,0,0,0.06)] border-t border-gray-100">
          <div
            className="flex items-center justify-between px-6 pr-0 pl-0 pt-3 pb-10"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
            }}
          >
            {items.map((it, idx) => {
              const active = idx === activeIndex;
              return (
                <div
                  key={it.key}
                  className="flex items-center flex-col relative"
                >
                  <div className="h-2 flex items-start justify-center mb-1">
                    {active && (
                      <div
                        className="w-8 h-1.5 rounded-full"
                        style={{ backgroundColor: "#FFCC19" }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-full transition-colors mx-8 w-6 h-6 mt-3.5",
                      active
                        ? "text-purple-600"
                        : "text-gray-400 hover:text-purple-400"
                    )}
                    aria-label={it.ariaLabel}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onChange?.(idx, it.key)}
                  >
                    <Image
                      src={it.iconPath || "/placeholder.svg"}
                      alt=""
                      width={48}
                      height={48}
                      className="w-12 h-12"
                      style={{
                        filter: active
                          ? "brightness(0) saturate(100%) invert(35%) sepia(85%) saturate(1352%) hue-rotate(248deg) brightness(95%) contrast(91%)"
                          : "brightness(0) saturate(100%) invert(60%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)",
                      }}
                    />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
