const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function createRateLimiter(requestsPerSecond = 3) {
  const queue = []
  let lastCallTime = 0
  const minInterval = 1000 / requestsPerSecond

  async function processQueue() {
    if (queue.length === 0) return
    const now = Date.now()
    const wait = Math.max(0, minInterval - (now - lastCallTime))
    await delay(wait)
    const { fn, resolve, reject } = queue.shift()
    lastCallTime = Date.now()
    try {
      resolve(await fn())
    } catch (err) {
      reject(err)
    }
    processQueue()
  }

  function enqueue(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      if (queue.length === 1) processQueue()
    })
  }

  return { enqueue }
}

const hasKey = !!import.meta.env.VITE_NCBI_API_KEY
// 키 있음: 9 r/s (공식 10 r/s 안전 마진)
// 키 없음: 2.5 r/s (공식 3 r/s 안전 마진)
export const ncbiLimiter = createRateLimiter(hasKey ? 9 : 2.5)
