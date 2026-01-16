
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
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let heartbeatInterval: NodeJS.Timeout;
    let inactivityTimeout: NodeJS.Timeout;

    const connect = () => {
      const isDev = !!(import.meta as any).env?.DEV;
      const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://100.116.47.110:8000';
      const wsUrl = isDev ? `ws://${window.location.host}/ws/updates` : `${String(base).replace(/^http/, 'ws')}/ws/updates`;
      
      console.log('Iniciando conexión WS...');
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WS conectado');
        // Iniciar latido (heartbeat) cada 30 segundos para mantener la conexión viva
        heartbeatInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      ws.onmessage = (ev) => {
        if (ev.data === 'pong') return; // Ignorar respuestas de latido
        console.log('WS mensaje:', ev.data);
        setWsMsg(String(ev.data));
        setTimeout(() => setWsMsg(null), 5000);
        resetInactivityTimeout(); // Resetear inactividad al recibir mensajes relevantes
      };

      ws.onerror = (e) => {
        console.error('WS error', e);
      };

      ws.onclose = (e) => {
        console.log('WS cerrado, intentando reconectar en 3s...', e.reason);
        clearInterval(heartbeatInterval);
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    const resetInactivityTimeout = () => {
      clearTimeout(inactivityTimeout);
      // Si el usuario está logueado, protegemos por inactividad (ej. 30 min)
      if (currentUser) {
        inactivityTimeout = setTimeout(() => {
          console.log('Inactividad detectada, cerrando sesión por seguridad.');
          handleLogout();
        }, 30 * 60 * 1000); // 30 minutos
      }
    };

    // Escuchar eventos del usuario para resetear inactividad
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, resetInactivityTimeout));

    connect();
    resetInactivityTimeout();

    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, resetInactivityTimeout));
      clearInterval(heartbeatInterval);
      clearTimeout(reconnectTimeout);
      clearTimeout(inactivityTimeout);
      if (ws) {
        ws.onclose = null; // Evitar reconexión al desmontar
        ws.close();
      }
    };
  }, [currentUser]);

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
