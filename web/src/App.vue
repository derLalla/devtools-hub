<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>
        <RouterLink to="/">Developer Tools</RouterLink>
      </h1>
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink v-if="auth.isAuthenticated" to="/admin">Admin</RouterLink>
        <RouterLink v-else to="/login">Login</RouterLink>
        <button v-if="auth.isAuthenticated" @click="logout">Logout</button>
      </nav>
    </header>
    <RouterView />
  </div>
</template>
