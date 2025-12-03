/**
 * Notifications Composable
 * Manages application notifications
 */

import { ref, readonly } from 'vue'

const notifications = ref([])
let notificationId = 0

export function useNotifications() {
  function notify(options) {
    const id = ++notificationId
    
    const notification = {
      id,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message || '',
      persistent: options.persistent || false,
      timestamp: Date.now()
    }
    
    notifications.value.push(notification)
    
    // Auto-dismiss non-persistent notifications
    if (!notification.persistent) {
      setTimeout(() => {
        dismiss(id)
      }, 5000)
    }
    
    return id
  }

  function dismiss(id) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  function dismissAll() {
    notifications.value = []
  }

  function success(message, title = 'Success') {
    return notify({ type: 'success', title, message })
  }

  function error(message, title = 'Error') {
    return notify({ type: 'error', title, message, persistent: true })
  }

  function warning(message, title = 'Warning') {
    return notify({ type: 'warning', title, message })
  }

  function info(message, title = 'Info') {
    return notify({ type: 'info', title, message })
  }

  return {
    notifications: readonly(notifications),
    notify,
    dismiss,
    dismissAll,
    success,
    error,
    warning,
    info
  }
}
