import Link from "next/link";
import { BookOpen, Library, Plus } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </span>
            <span>
              <span className="font-display block text-lg leading-none">
                Chard's Reviewer
              </span>
              <span className="text-xs text-muted-foreground">
                Module to quiz
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              New
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Library className="h-4 w-4" />
              Library
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
