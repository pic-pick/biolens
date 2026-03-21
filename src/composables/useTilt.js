import { ref } from 'vue'

/**
 * 3D tilt effect on mouse move
 * Usage: const { tiltStyle, onMouseMove, onMouseLeave } = useTilt()
 */
export function useTilt(maxDeg = 6) {
  const tiltStyle = ref({})

  function onMouseMove(e) {
    const el   = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x    = e.clientX - rect.left
    const y    = e.clientY - rect.top
    const cx   = rect.width  / 2
    const cy   = rect.height / 2
    const rotX = ((y - cy) / cy) * -maxDeg
    const rotY = ((x - cx) / cx) *  maxDeg

    tiltStyle.value = {
      transform:  `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(4px)`,
      transition: 'transform 0.08s linear',
    }
  }

  function onMouseLeave() {
    tiltStyle.value = {
      transform:  'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
      transition: 'transform 0.45s cubic-bezier(0.23,1,0.32,1)',
    }
  }

  return { tiltStyle, onMouseMove, onMouseLeave }
}
