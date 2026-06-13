"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Hero WebGL : des « documents » flottent en 3D et s'inclinent vers le curseur.
 * Léger (MeshBasic + textures canvas), nettoyé au démontage, désactivé si
 * l'utilisateur préfère réduire les animations.
 */
export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Texture « fiche document » dessinée sur un canvas 2D.
    function makeCardTexture(accent: string): THREE.CanvasTexture {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 340;
      const g = c.getContext("2d")!;
      const r = 22;
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = "#ffffff";
      g.strokeStyle = "rgba(16,16,18,0.08)";
      g.lineWidth = 2;
      // carte arrondie
      g.beginPath();
      g.moveTo(r, 0);
      g.arcTo(c.width, 0, c.width, c.height, r);
      g.arcTo(c.width, c.height, 0, c.height, r);
      g.arcTo(0, c.height, 0, 0, r);
      g.arcTo(0, 0, c.width, 0, r);
      g.closePath();
      g.fill();
      g.stroke();
      // bandeau coloré
      g.fillStyle = accent;
      g.beginPath();
      g.roundRect(28, 30, 70, 70, 16);
      g.fill();
      // lignes de texte
      g.fillStyle = "rgba(16,16,18,0.12)";
      const lines = [
        [120, 40, 100],
        [120, 64, 70],
        [28, 132, 200],
        [28, 160, 200],
        [28, 188, 150],
        [28, 240, 200],
        [28, 268, 120],
      ];
      for (const [x, y, w] of lines) {
        g.beginPath();
        g.roundRect(x, y, w, 12, 6);
        g.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    }

    const accents = ["#2563eb", "#3b82f6", "#93c5fd", "#1d4ed8"];
    const textures = accents.map(makeCardTexture);

    const group = new THREE.Group();
    scene.add(group);

    type Card = { mesh: THREE.Mesh; phase: number; floatSpeed: number; spin: number };
    const cards: Card[] = [];
    const COUNT = 13;
    for (let i = 0; i < COUNT; i++) {
      const tex = textures[i % textures.length];
      const geo = new THREE.PlaneGeometry(1.5, 2);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.96,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const s = 0.5 + Math.random() * 0.9;
      mesh.scale.setScalar(s);
      mesh.position.set(
        (Math.random() - 0.5) * 13,
        (Math.random() - 0.5) * 7,
        (Math.random() - 0.5) * 6 - 1
      );
      mesh.rotation.set(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.4
      );
      group.add(mesh);
      cards.push({
        mesh,
        phase: Math.random() * Math.PI * 2,
        floatSpeed: 0.4 + Math.random() * 0.5,
        spin: (Math.random() - 0.5) * 0.15,
      });
    }

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    function onPointer(e: PointerEvent) {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onPointer);

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const clock = new THREE.Clock();
    let raf = 0;
    function frame() {
      const t = clock.getElapsedTime();
      pointer.x += (target.x - pointer.x) * 0.05;
      pointer.y += (target.y - pointer.y) * 0.05;
      group.rotation.y = pointer.x * 0.35;
      group.rotation.x = -pointer.y * 0.22;
      for (const c of cards) {
        c.mesh.position.y += Math.sin(t * c.floatSpeed + c.phase) * 0.0025;
        c.mesh.rotation.z += c.spin * 0.003;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      cards.forEach((c) => {
        c.mesh.geometry.dispose();
        (c.mesh.material as THREE.Material).dispose();
      });
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}
