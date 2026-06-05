import { createRouter, createWebHistory } from 'vue-router';
import Landing from './views/Landing.vue';
import Login from './views/Login.vue';
import Admin from './views/Admin.vue';
import { useAuthStore } from './stores/auth';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Landing },
    { path: '/login', name: 'login', component: Login },
    { path: '/admin', name: 'admin', component: Admin, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
  }
  return true;
});
