import { Sidebar } from './Sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            <Sidebar />
            <main className="md:pl-64 min-h-screen transition-all duration-300">
                <div className="container mx-auto p-6 md:p-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
