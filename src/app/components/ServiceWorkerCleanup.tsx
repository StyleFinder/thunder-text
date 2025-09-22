'use client'

import { useEffect } from 'react'

export function ServiceWorkerCleanup() {
  useEffect(() => {
    // Unregister any existing service workers to clear old cache
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          console.log('Unregistering service worker:', registration.scope)
          registration.unregister()
        })
      }).catch(error => {
        console.log('Service worker cleanup failed:', error)
      })
    }
  }, [])

  return null
}