import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/sessions',
    name: 'Sessions',
    component: () => import('../views/Sessions.vue')
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('../views/Stats.vue')
  },
  {
    path: '/players',
    name: 'Players',
    component: () => import('../views/Players.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue')
  },
  {
    path: '/teams',
    name: 'Teams',
    component: () => import('../views/Teams.vue')
  },
  {
    path: '/help',
    name: 'Help',
    component: () => import('../views/Help.vue')
  },
  {
    path: '/analyze',
    name: 'Analyze',
    component: () => import('../views/Analyze.vue')
  },
  {
    path: '/fflogs',
    name: 'Fflogs',
    component: () => import('../views/FflogsQuery.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
