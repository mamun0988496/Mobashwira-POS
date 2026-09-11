import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ShopProvider } from './context/ShopContext';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { BrandsPage } from './pages/BrandsPage';
import { StockPage } from './pages/StockPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { DueManagementPage } from './pages/DueManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReturnPage } from './pages/ReturnPage'; // নতুন রিটার্ন পেজ ইম্পোর্ট করা হলো

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />;
      case 'pos':
        return <POSPage />;
      case 'products':
        return <ProductsPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'brands':
        return <BrandsPage />;
      case 'stock':
        return <StockPage />;
      case 'customers':
        return <CustomersPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'return':
        return <ReturnPage />; // রিটার্ন পেজের রাউট যোগ করা হলো
      case 'dues':
        return <DueManagementPage />;
      case 'reports':
        return <ReportsPage />;
      case 'history':
        return <SalesHistoryPage />;
      case 'users':
        return <UsersPage />;
      case 'backup':
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex antialiased relative overflow-hidden">
      {/* Radial Gradient Frosted Backdrop */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,#e0e7ff_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b_0%,transparent_50%)] pointer-events-none z-0" />

      {/* Dark Frosted Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 bg-transparent z-10 overflow-hidden">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* এখানে জোর করে ফুলউইডথ করার ক্লাসটি সরিয়ে max-w-[1500px] mx-auto দেওয়া হয়েছে। 
            ফলে বড় স্ক্রিনে পেজগুলো টেনে লম্বা না হয়ে একদম সুন্দরভাবে মাঝখানে থাকবে। */}
        <main className="flex-1 overflow-y-auto relative p-3 sm:p-4 md:p-6">
          <div className="max-w-[1500px] mx-auto w-full">
            {renderActivePage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ShopProvider>
        <MainLayout />
      </ShopProvider>
    </AuthProvider>
  );
}