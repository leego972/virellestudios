import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

function ensureMeta(name: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  return meta;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return stored === "light" || stored === "dark"
        ? stored
        : defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    const isNightMode = theme === "dark";

    /*
     * Virelle's legacy stylesheet assigns the cream palette to `.dark` and the
     * black palette to the root selector. Preserve those stable selectors while
     * exposing correct user-facing semantics: light = day, dark = night.
     */
    root.classList.toggle("dark", !isNightMode);
    root.dataset.theme = theme;
    root.style.colorScheme = isNightMode ? "dark" : "light";

    ensureMeta("theme-color").content = isNightMode ? "#09090b" : "#f5efe2";
    ensureMeta("color-scheme").content = isNightMode ? "dark" : "light";

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setTheme(previous => (previous === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, switchable }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
