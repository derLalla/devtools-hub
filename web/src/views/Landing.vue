<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { listLinks, type LinkDto } from '../api/client';

const links = ref<LinkDto[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function initials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    links.value = await listLinks();
  } catch (e) {
    error.value = 'Failed to load links.';
    console.error(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const hasLinks = computed(() => links.value.length > 0);
</script>

<template>
  <section>
    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="!hasLinks" class="muted">
      No links configured yet. An administrator can add them in the
      <RouterLink to="/admin">admin panel</RouterLink>.
    </p>
    <div v-else class="card-grid">
      <a
        v-for="link in links"
        :key="link.id"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="card"
      >
        <div class="icon">
          <img v-if="link.icon && isUrl(link.icon)" :src="link.icon" :alt="link.title" />
          <span v-else>{{ initials(link.title) }}</span>
        </div>
        <span v-if="link.category" class="category">{{ link.category }}</span>
        <h3>{{ link.title }}</h3>
        <p v-if="link.description">{{ link.description }}</p>
      </a>
    </div>
  </section>
</template>
