import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  variant?: 'pills' | 'underline' | 'boxed';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'pills',
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
  };

  const renderBadge = (badge?: number | string) => {
    if (badge === undefined || badge === null) return null;
    return (
      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
        {badge}
      </span>
    );
  };

  if (variant === 'pills') {
    return (
      <div className={`inline-flex rounded-xl bg-slate-100 p-1 ${fullWidth ? 'w-full' : ''} ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${sizeClasses[size]} ${fullWidth ? 'flex-1' : ''} inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon && <span className="inline-flex">{tab.icon}</span>}
            {tab.label}
            {renderBadge(tab.badge)}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-slate-200 ${fullWidth ? 'w-full' : ''} ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${sizeClasses[size]} ${fullWidth ? 'flex-1' : ''} inline-flex items-center justify-center font-bold transition-all duration-200 border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.icon && <span className="inline-flex">{tab.icon}</span>}
            {tab.label}
            {renderBadge(tab.badge)}
          </button>
        ))}
      </div>
    );
  }

  // boxed variant
  return (
    <div className={`inline-flex gap-1 ${fullWidth ? 'w-full' : ''} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`${sizeClasses[size]} ${fullWidth ? 'flex-1' : ''} inline-flex items-center justify-center rounded-xl font-bold border transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {tab.icon && <span className="inline-flex">{tab.icon}</span>}
          {tab.label}
          {renderBadge(tab.badge)}
        </button>
      ))}
    </div>
  );
};
