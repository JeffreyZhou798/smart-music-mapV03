<script setup>
import { useNotifications } from '../../composables/useNotifications.js'

const { notifications, dismiss } = useNotifications()

const typeIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
}
</script>

<template>
  <div class="notification-container">
    <TransitionGroup name="notification">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="notification"
        :class="notification.type"
      >
        <span class="notification-icon">{{ typeIcons[notification.type] }}</span>
        <div class="notification-content">
          <strong v-if="notification.title">{{ notification.title }}</strong>
          <p>{{ notification.message }}</p>
        </div>
        <button class="notification-close" @click="dismiss(notification.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.notification-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 400px;
}

.notification {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-left: 4px solid;
}

.notification.success {
  border-color: #4ade80;
}

.notification.error {
  border-color: #f87171;
}

.notification.warning {
  border-color: #fbbf24;
}

.notification.info {
  border-color: #60a5fa;
}

.notification-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.notification.success .notification-icon {
  background: #dcfce7;
  color: #16a34a;
}

.notification.error .notification-icon {
  background: #fee2e2;
  color: #dc2626;
}

.notification.warning .notification-icon {
  background: #fef3c7;
  color: #d97706;
}

.notification.info .notification-icon {
  background: #dbeafe;
  color: #2563eb;
}

.notification-content {
  flex: 1;
}

.notification-content strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #1e293b;
}

.notification-content p {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.notification-close:hover {
  color: #475569;
}

/* Transitions */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
