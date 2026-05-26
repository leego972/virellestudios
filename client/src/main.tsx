try {
    const rootEl = document.getElementById("root");
    if (!rootEl) throw new Error("#root element not found in DOM");
    createRoot(rootEl).render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    );
  } catch (err: unknown) {
    const m = err instanceof Error ? err.message + "\n" + (err.stack ?? "") : String(err);
    __showFatalError("createRoot crash:\n" + m);
  }
  