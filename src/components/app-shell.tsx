import Link from "next/link";
import { BookOpen, Library, Plus } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:h-16 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:h-9 sm:w-9">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-base leading-none sm:text-lg">
                Chard's Reviewer
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Module to quiz
              </span>
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium hover:bg-accent sm:gap-2 sm:px-3"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium hover:bg-accent sm:gap-2 sm:px-3"
            >
              <Library className="h-4 w-4" />
              <span>Library</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:py-10 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
