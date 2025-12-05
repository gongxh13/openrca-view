import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeConfig } from 'antd';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const lightThemeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#1890ff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorText: '#262626',
    colorTextSecondary: '#8c8c8c',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Layout: {
      bodyBg: '#f5f5f5',
      headerBg: '#001529',
      headerColor: '#ffffff',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    },
    Button: {
      borderRadius: 6,
    },
    Table: {
      borderRadius: 8,
    },
  },
};

const darkThemeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#177ddc',
    colorBgContainer: '#141414',
    colorBgElevated: '#1f1f1f',
    colorBgLayout: '#000000',
    colorText: '#ffffff',
    colorTextSecondary: '#a6a6a6',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  components: {
    Layout: {
      bodyBg: '#000000',
      headerBg: '#141414',
      headerColor: '#ffffff',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)',
      colorBgContainer: '#1f1f1f',
    },
    Button: {
      borderRadius: 6,
    },
    Table: {
      borderRadius: 8,
      colorBgContainer: '#1f1f1f',
      headerBg: '#262626',
    },
    Select: {
      colorText: '#ffffff',
      colorTextPlaceholder: '#a6a6a6',
      colorBgContainer: '#1f1f1f',
      colorBorder: '#434343',
      optionSelectedBg: '#177ddc',
      optionActiveBg: '#262626',
    },
    DatePicker: {
      colorText: '#ffffff',
      colorTextPlaceholder: '#a6a6a6',
      colorBgContainer: '#1f1f1f',
      colorBorder: '#434343',
    },
  },
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme') as ThemeMode;
    return saved || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    // 更新body类名以便全局样式
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const themeConfig = theme === 'light' ? lightThemeConfig : darkThemeConfig;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
};

