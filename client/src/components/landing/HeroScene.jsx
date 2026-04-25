import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

/* ── Animated particle field ───────────────────────── */
function ParticleField({ count = 600 }) {
  const mesh = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.02;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#6366f1"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

/* ── Wireframe globe ──────────────────────────────── */
function WireGlobe() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.08;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <icosahedronGeometry args={[2.4, 3]} />
      <meshBasicMaterial
        color="#818cf8"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

/* ── Floating orbs ────────────────────────────────── */
function FloatingOrb({ position, color, size = 0.5, speed = 1 }) {
  return (
    <Float speed={speed} rotationIntensity={0.4} floatIntensity={1.5}>
      <Sphere args={[size, 32, 32]} position={position}>
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.35}
          distort={0.3}
          speed={2}
          roughness={0.2}
        />
      </Sphere>
    </Float>
  );
}

/* ── Connecting lines between orbs ─────────────── */
function ConnectionLines() {
  const ref = useRef();
  const points = useMemo(() => {
    const pts = [];
    const orbPositions = [
      [-3, 1, -2],
      [3.5, -0.5, -1],
      [-1, -2, -3],
      [2, 2, -2],
      [0, 0, 0],
    ];
    for (let i = 0; i < orbPositions.length; i++) {
      for (let j = i + 1; j < orbPositions.length; j++) {
        pts.push(
          new THREE.Vector3(...orbPositions[i]),
          new THREE.Vector3(...orbPositions[j])
        );
      }
    }
    return pts;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.03) * 0.05;
    }
  });

  return (
    <group ref={ref}>
      {Array.from({ length: points.length / 2 }).map((_, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                points[i * 2].x, points[i * 2].y, points[i * 2].z,
                points[i * 2 + 1].x, points[i * 2 + 1].y, points[i * 2 + 1].z,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#6366f1" transparent opacity={0.08} />
        </line>
      ))}
    </group>
  );
}

/* ── Main exported scene ──────────────────────────── */
export default function HeroScene() {
  return (
    <div className="hero-canvas-container">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#818cf8" />
        <pointLight position={[-10, -5, 5]} intensity={0.3} color="#6366f1" />

        <WireGlobe />
        <ParticleField />
        <ConnectionLines />

        <FloatingOrb position={[-3, 1, -2]} color="#818cf8" size={0.35} speed={1.2} />
        <FloatingOrb position={[3.5, -0.5, -1]} color="#6366f1" size={0.45} speed={0.8} />
        <FloatingOrb position={[-1, -2, -3]} color="#a78bfa" size={0.3} speed={1.5} />
        <FloatingOrb position={[2, 2, -2]} color="#c4b5fd" size={0.25} speed={1} />
      </Canvas>
    </div>
  );
}
