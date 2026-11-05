function localPort(value: string | undefined, fallback: number) {
  const port = value === undefined ? fallback : Number(value)
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Fixture ports must be integers from 1024 to 65535")
  return port
}
const legacyOrigin = process.env.FOCUS_TEST_API
if (legacyOrigin && !/^http:\/\/127\.0\.0\.1:\d+$/.test(legacyOrigin))
  throw new Error("Tests may only use the isolated loopback fixture")
export const fixturePort = localPort(
  process.env.FOCUS_FIXTURE_PORT ?? legacyOrigin?.split(":").at(-1),
  18081
)
export const previewPort = localPort(process.env.FOCUS_TEST_PORT, 4173)
export const fixtureOrigin = `http://127.0.0.1:${fixturePort}`
