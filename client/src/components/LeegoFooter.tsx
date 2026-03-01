export default function LeegoFooter() {
  return (
    <div className="w-full flex justify-center items-center py-8 mt-auto opacity-70 hover:opacity-100 transition-opacity duration-300">
      <img
        src="/leego-logo.png"
        alt="Created by Leego"
        className="h-24 sm:h-28 w-auto object-contain"
        style={{
          mixBlendMode: "lighten",
          filter: "drop-shadow(0 0 8px rgba(34, 197, 94, 0.6)) drop-shadow(0 0 20px rgba(34, 197, 94, 0.4)) drop-shadow(0 0 40px rgba(34, 197, 94, 0.2))",
        }}
        draggable={false}
      />
    </div>
  );
}
