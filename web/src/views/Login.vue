<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";

const username = ref("");
const password = ref("");
const error = ref<string | null>(null);
const submitting = ref(false);

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function submit() {
  error.value = null;
  submitting.value = true;
  try {
    await auth.login(username.value.trim(), password.value);
    const redirect = (route.query.redirect as string) || "/admin";
    router.push(redirect);
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    error.value =
      status === 401
        ? "Invalid username or password."
        : "Login failed. Please try again.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="section login-card">
    <h2>Administrator Login</h2>
    <form @submit.prevent="submit">
      <div style="margin-bottom: 0.75rem">
        <label for="username">Username</label>
        <input
          id="username"
          v-model="username"
          autocomplete="username"
          required
        />
      </div>
      <div style="margin-bottom: 0.75rem">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" class="primary" :disabled="submitting">
        {{ submitting ? "Signing in…" : "Sign in" }}
      </button>
    </form>
  </section>
</template>
