import Background from "@/components/layout/Background";

type StandaloneLayoutProps = {
  children: React.ReactNode;
};

export default function StandaloneLayout({ children }: StandaloneLayoutProps) {
  return (
    <div className="relative w-full min-h-screen bg-transparent text-slate-800 dark:text-slate-200 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/40 selection:text-blue-900 dark:selection:text-blue-100">
      <Background />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
