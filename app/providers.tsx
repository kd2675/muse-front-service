"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Provider } from "react-redux";
import { Suspense, useState } from "react";
import { store } from "./store/store";
import Toast from "./components/Toast";
import AuthWatcher from "./components/AuthWatcher";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
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
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          {children}
          <Toast />
          <Suspense fallback={null}>
            <AuthWatcher />
          </Suspense>
        </MotionConfig>
      </QueryClientProvider>
    </Provider>
  );
}
