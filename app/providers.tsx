"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { MotionConfig } from "motion/react";
import { Provider } from "react-redux";
import { Suspense, useState, useSyncExternalStore } from "react";
import { store } from "./store/store";
import Toast from "./components/Toast";
import AuthWatcher from "./components/AuthWatcher";
import AuthBootstrap from "./components/AuthBootstrap";
import ScrollHistoryManager from "./components/ScrollHistoryManager";
import ProtectedContent from "./components/ProtectedContent";
import { getUserFromToken } from "./lib/auth";
import { onAuthChanged } from "./lib/authEvents";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  const identity = useSyncExternalStore(onAuthChanged, () => getUserFromToken()?.id ?? "guest", () => "guest");
  return <Provider store={store}><SessionProviders key={identity}>{children}</SessionProviders></Provider>;
}

function SessionProviders({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <ProtectedContent>{children}</ProtectedContent>
          <Suspense fallback={null}>
            <ScrollHistoryManager />
          </Suspense>
          <Suspense fallback={null}>
            <AuthBootstrap />
          </Suspense>
          <Toast />
          <Suspense fallback={null}>
            <AuthWatcher />
          </Suspense>
          {process.env.NODE_ENV === "development" ? (
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
          ) : null}
        </MotionConfig>
      </QueryClientProvider>
  );
}
