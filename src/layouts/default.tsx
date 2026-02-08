import { Link } from "@heroui/link";
import { Chip } from "@heroui/chip";
import { Github } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";

import { Navbar } from "@/components/navbar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col h-screen">
      <Navbar />
      <main className="container mx-auto max-w-7xl px-6 flex-grow pt-4">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-4 bg-content1 border-t border-divider">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-default-600">Made by</span>
            <Link
              isExternal
              href="https://github.com/ags-arnab"
              title="GitHub Profile of Arnab Ghosh"
            >
              <Chip
                color="primary"
                startContent={<Github size={16} />}
                variant="flat"
              >
                Arnab Ghosh
              </Chip>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-default-600">Idea by</span>
            <Link
              isExternal
              href="https://github.com/AffanHossainRakib"
              title="GitHub Profile of Affan Hossain Rakib"
            >
              <Chip
                color="secondary"
                startContent={<Github size={16} />}
                variant="flat"
              >
                Affan Hossain Rakib
              </Chip>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-default-600">Data provided by</span>
            <Link
              isExternal
              href="https://github.com/Eniamza"
              title="GitHub Profile of Tashfeen Azmaine"
            >
              <Chip
                color="success"
                startContent={<Github size={16} />}
                variant="flat"
              >
                Tashfeen Azmaine
              </Chip>
            </Link>
          </div>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}
