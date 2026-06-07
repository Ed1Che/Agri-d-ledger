/**
 * Next.js 16.2 workaround for E1068 bug:
 * `createMetadataComponents` calls `workAsyncStorage.getStore()` unconditionally
 * during `/_global-error` prerendering, but the store is never initialised for
 * that synthetic route. We monkey-patch getStore so it returns an inert object
 * instead of null, allowing the prerender branch to short-circuit safely.
 *
 * Remove this file once the project upgrades past the fixed Next.js version.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    // Resolve the internal async-storage module Next.js uses.
    const storageModule = require(
      'next/dist/server/app-render/work-async-storage.external'
    ) as { workAsyncStorage: { getStore: () => unknown } }

    const storage = storageModule.workAsyncStorage
    if (!storage) return

    const original = storage.getStore.bind(storage)
    storage.getStore = function patchedGetStore() {
      const store = original()
      if (store !== undefined && store !== null) return store

      // Return a minimal inert store that satisfies the shape checks
      // downstream (forceStatic = true makes `N` return {} immediately).
      return { forceStatic: true, route: '/_global-error', __patched: true }
    }
  } catch {
    // Module path differs across Next.js versions — silently skip.
  }
}
