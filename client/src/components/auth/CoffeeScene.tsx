import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * WebGL backdrop for the auth screens: roasted beans tumbling slowly through
 * warm light at varied depths.
 *
 * Built on plain react-three-fiber rather than drei so there is one less
 * version pairing to go wrong, and drawn as a single instanced mesh so all
 * ~60 beans cost one draw call.
 *
 * This module is imported lazily by the page, so three.js lands in its own
 * chunk and never touches the main bundle.
 */

const BEAN_COUNT = 60

interface BeanSeed {
  position: THREE.Vector3
  axis: THREE.Vector3
  spin: number
  drift: number
  phase: number
  scale: number
}

function Beans() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Fixed layout per mount: deterministic enough to look composed rather than
  // scattered, with depth spread so the fog has something to work with.
  const seeds = useMemo<BeanSeed[]>(() => {
    const items: BeanSeed[] = []
    for (let i = 0; i < BEAN_COUNT; i++) {
      const t = i / BEAN_COUNT
      const angle = t * Math.PI * 2 * 3.3
      const radius = 3.2 + (i % 7) * 0.9
      items.push({
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          (t - 0.5) * 14,
          -2 - (i % 11) * 1.6
        ),
        axis: new THREE.Vector3(
          Math.sin(i * 1.7),
          Math.cos(i * 2.3),
          Math.sin(i * 0.9)
        ).normalize(),
        spin: 0.12 + (i % 5) * 0.05,
        drift: 0.25 + (i % 4) * 0.12,
        phase: i * 0.7,
        scale: 0.22 + (i % 6) * 0.05,
      })
    }
    return items
  }, [])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const time = clock.getElapsedTime()

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i]

      // Slow vertical drift that wraps, so beans rise forever.
      const y = ((seed.position.y + time * seed.drift + 7) % 14) - 7

      dummy.position.set(
        seed.position.x + Math.sin(time * 0.25 + seed.phase) * 0.35,
        y,
        seed.position.z
      )
      dummy.quaternion.setFromAxisAngle(seed.axis, time * seed.spin + seed.phase)
      // Squashed sphere reads as a coffee bean at this scale.
      dummy.scale.set(seed.scale, seed.scale * 0.74, seed.scale * 0.6)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as never, undefined as never, BEAN_COUNT]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 20, 14]} />
      <meshStandardMaterial color="#4a2c1a" roughness={0.62} metalness={0.15} />
    </instancedMesh>
  )
}

/** Eases the camera toward the pointer for a parallax that reacts to the user. */
function CameraRig() {
  const { camera, pointer } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    target.set(pointer.x * 1.1, pointer.y * 0.7, 9)
    camera.position.lerp(target, 0.035)
    camera.lookAt(0, 0, 0)
  })

  return null
}

export default function CoffeeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 42 }}
      // Capped so the scene stays cheap on high-DPI laptops.
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Fog does the depth work: distant beans fade into the ink background. */}
      <fog attach="fog" args={['#100e0e', 8, 22]} />

      <ambientLight intensity={0.55} color="#e8d5bf" />
      <directionalLight position={[4, 6, 6]} intensity={2.1} color="#ffd9a8" />
      <pointLight position={[-6, -2, 3]} intensity={22} color="#c7a17a" distance={18} />
      <pointLight position={[5, 3, -4]} intensity={14} color="#8a5a33" distance={20} />

      <Beans />
      <CameraRig />
    </Canvas>
  )
}
