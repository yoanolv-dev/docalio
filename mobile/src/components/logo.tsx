import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/** Logo Docalio (même dessin que l'icône du site). */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityLabel="Docalio">
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3b82f6" />
          <Stop offset="1" stopColor="#1d4ed8" />
        </LinearGradient>
      </Defs>
      <Rect width="32" height="32" rx="9" fill="url(#g)" />
      <Path d="M10 8h7.5a8 8 0 0 1 0 16H10z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <Path d="m13.2 16.2 2.3 2.3 4.3-4.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
