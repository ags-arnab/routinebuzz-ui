import type { NavigateOptions } from "react-router-dom";

import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { useHref, useNavigate } from "react-router-dom";
import { SWRConfig } from "swr";
import { useEffect, useState } from "react";

import { RoutineProvider } from "@/contexts/routine-context";

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

export function Provider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000,
        focusThrottleInterval: 60000,
        errorRetryCount: 2,
        keepPreviousData: true,
        revalidateIfStale: false,
      }}
    >
      <HeroUIProvider navigate={navigate} useHref={useHref}>
        <RoutineProvider>
          <ToastProvider
            placement={isMobile ? "bottom-center" : "top-right"}
            toastProps={{
              classNames: {
                base: isMobile ? "mb-safe" : "",
              },
            }}
          />
          {children}
        </RoutineProvider>
      </HeroUIProvider>
    </SWRConfig>
  );
}
