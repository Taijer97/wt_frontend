
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { PurchaseModule } from './components/PurchaseModule';
import { InventoryTransferModule } from './components/InventoryTransferModule';
import { SalesModule } from './components/SalesModule';
import { DirectPurchaseModule } from './components/DirectPurchaseModule';
import { SalesHistoryModule } from './components/SalesHistoryModule';
import { SettingsModule } from './components/SettingsModule';
import { PayrollModule } from './components/PayrollModule';
import { ExpensesModule } from './components/ExpensesModule';
import { SireModule } from './components/SireModule'; // Nuevo Import
import { Login } from './components/Login';
import { Register } from './components/Register';
import { FileText, Loader2 } from 'lucide-react';
import { DataService } from './services/dataService';
import { BackendService } from './services/backendService';
import { Employee } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [viewState, setViewState] = useState<'LOGIN' | 'REGISTER' | 'APP'>('LOGIN');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wsMsg, setWsMsg] = useState<string | null>(null);
  // Inicializar en true si hay sesión guardada para evitar "parpadeo" del Login
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem('mype_session'));

  useEffect(() => {
    const initSession = async () => {
      const raw = localStorage.getItem('mype_session');
      if (raw) {
        try {
          const user = JSON.parse(raw);
          // Si el estado inicial fue false (raro pero posible por race condition), aseguramos true
          setIsLoading(true); 
          await syncConfig(); 
          setCurrentUser(user);
          setViewState('APP');
        } catch {
          localStorage.removeItem('mype_session'); // Limpiar sesión corrupta
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/updates');
    ws.onopen = () => console.log('WS conectado');
    ws.onmessage = (ev) => { console.log('WS mensaje:', ev.data); setWsMsg(String(ev.data)); setTimeout(() => setWsMsg(null), 5000); };
    ws.onerror = (e) => console.error('WS error', e);
    return () => { try { ws.close(); } catch { /* noop */ } };
  }, []);

  const syncConfig = async () => {
      try {
          const [config, roles] = await Promise.all([
              BackendService.getConfig(),
              BackendService.getRoles()
          ]);
          
          const roleConfigs = roles.map((r: any) => ({
               id: r.id,
               role: r.name,
               label: r.label,
               permissions: r.permissions
          }));
          
          const fullConfig = {
              ...config,
              roleConfigs: roleConfigs.length > 0 ? roleConfigs : (DataService.getConfig().roleConfigs || [])
          };
          
          DataService.saveConfig(fullConfig);
          console.log("Config synced on login/load");
      } catch (e) {
          console.error("Config sync failed", e);
      }
  };

  const handleLogin = async (user: Employee) => {
    await syncConfig();
    setCurrentUser(user);
    setViewState('APP');
    setActiveTab('dashboard'); 
  };

  const handleLogout = () => {
    DataService.logout();
    setCurrentUser(null);
    setViewState('LOGIN');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'compras':
        return <PurchaseModule />;
      case 'compras-mayoristas':
        return <DirectPurchaseModule />;
      case 'inventario':
        return <InventoryTransferModule />;
      case 'gastos':
        return <ExpensesModule />; 
      case 'ventas':
        return <SalesModule />;
      case 'historial-ventas':
        return <SalesHistoryModule />;
      case 'planilla':
        return <PayrollModule />;
      case 'configuracion':
        return <SettingsModule />;
      case 'contabilidad':
        return <SireModule />; // Renderiza el nuevo módulo
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center z-50 fixed inset-0">
        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">WasiTech</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider animate-pulse">Sincronizando datos del sistema...</p>
      </div>
    );
  }

  if (viewState === 'LOGIN') {
    return <Login onLoginSuccess={handleLogin} onGoToRegister={() => setViewState('REGISTER')} />;
  }

  if (viewState === 'REGISTER') {
    return <Register onBack={() => setViewState('LOGIN')} />;
  }

  if (currentUser) {
    return (
      <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        {wsMsg && (
          <div className="mb-2 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black uppercase tracking-widest px-3 py-2 rounded-xl">
            {wsMsg}
          </div>
        )}
        {renderContent()}
      </Layout>
    );
  }

  return null;
};

export default App;
