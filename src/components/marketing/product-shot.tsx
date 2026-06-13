import { cn } from "@/lib/utils";

/**
 * Capture produit réelle (PNG retina générée depuis l'app, cf. scripts/shoot.cjs).
 * Le cadre « navigateur » est déjà inclus dans l'image ; on ajoute ici une
 * ombre douce pour la faire flotter sur le fond clair.
 */
export function ProductShot({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl shadow-[0_30px_80px_-36px_rgba(15,18,30,0.45)]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className="block h-auto w-full"
      />
    </div>
  );
}
