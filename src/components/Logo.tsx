// Marca da Remoctrl — usa o PNG real (logo-of.png) servido em /logo.png.

interface Props {
  /** Tamanho em px. */
  size?: number;
  /** Mostra o wordmark "Remoctrl" ao lado do mark? */
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 22, showWordmark = false, className = "" }: Props) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <img
        src="/logo.png"
        alt="Remoctrl"
        width={size}
        height={size}
        className="rounded-md shrink-0"
        style={{ width: size, height: size }}
        draggable={false}
      />
      {showWordmark && (
        <span
          className="font-extrabold text-white tracking-tight"
          style={{ fontSize: Math.round(size * 0.7) }}
        >
          Remoctrl
        </span>
      )}
    </div>
  );
}
