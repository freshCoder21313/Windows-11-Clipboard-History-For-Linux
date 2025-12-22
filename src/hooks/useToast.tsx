import { useState, useCallback } from 'react'
import { Toast } from '../components/Toast'

export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
  }, [])

  const ToastContainer = useCallback(
    ({ isDark, opacity }: { isDark: boolean; opacity: number }) =>
      toastMessage ? (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          isDark={isDark}
          opacity={opacity}
        />
      ) : null,
    [toastMessage],
  )

  return { toastMessage, showToast, ToastContainer }
}
