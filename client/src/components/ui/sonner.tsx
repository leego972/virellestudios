import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "oklch(0.08 0.005 260 / 0.95)",
          "--normal-text": "oklch(0.95 0.01 90)",
          "--normal-border": "oklch(0.78 0.18 85 / 0.25)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
