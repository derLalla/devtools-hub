<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  listLinks,
  createLink,
  updateLink,
  deleteLink,
  type LinkDto,
  type LinkInput
} from '../api/client';

const links = ref<LinkDto[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const blankForm = (): LinkInput => ({
  title: '',
  url: '',
  description: '',
  icon: '',
  category: '',
  sortOrder: 0
});

const form = reactive<LinkInput>(blankForm());
const editingId = ref<string | null>(null);

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

function startEdit(link: LinkDto) {
  editingId.value = link.id;
  Object.assign(form, {
    title: link.title,
    url: link.url,
    description: link.description ?? '',
    icon: link.icon ?? '',
    category: link.category ?? '',
    sortOrder: link.sortOrder
  });
}

function cancelEdit() {
  editingId.value = null;
  Object.assign(form, blankForm());
}

async function submit() {
  error.value = null;
  try {
    const payload: LinkInput = {
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description?.trim() || undefined,
      icon: form.icon?.trim() || undefined,
      category: form.category?.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0
    };
    if (editingId.value) {
      await updateLink(editingId.value, payload);
    } else {
      await createLink(payload);
    }
    cancelEdit();
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
    error.value = msg ?? 'Save failed.';
  }
}

async function remove(link: LinkDto) {
  if (!confirm(`Delete "${link.title}"?`)) return;
  try {
    await deleteLink(link.id);
    if (editingId.value === link.id) cancelEdit();
    await load();
  } catch (e) {
    error.value = 'Delete failed.';
    console.error(e);
  }
}

onMounted(load);
</script>

<template>
  <section>
    <div class="section">
      <h2 style="margin-top: 0">{{ editingId ? 'Edit link' : 'New link' }}</h2>
      <form @submit.prevent="submit">
        <div class="form-grid">
          <div>
            <label for="title">Title *</label>
            <input id="title" v-model="form.title" required maxlength="200" />
          </div>
          <div>
            <label for="url">URL *</label>
            <input id="url" v-model="form.url" type="url" required maxlength="2048" />
          </div>
          <div>
            <label for="category">Category</label>
            <input id="category" v-model="form.category" maxlength="100" />
          </div>
          <div>
            <label for="icon">Icon (URL or name)</label>
            <input id="icon" v-model="form.icon" maxlength="512" />
          </div>
          <div class="full">
            <label for="description">Description</label>
            <textarea id="description" v-model="form.description" rows="2" maxlength="1000"></textarea>
          </div>
          <div>
            <label for="sortOrder">Sort order</label>
            <input id="sortOrder" v-model.number="form.sortOrder" type="number" />
          </div>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div style="margin-top: 0.9rem; display: flex; gap: 0.5rem">
          <button type="submit" class="primary">
            {{ editingId ? 'Update' : 'Create' }}
          </button>
          <button v-if="editingId" type="button" @click="cancelEdit">Cancel</button>
        </div>
      </form>
    </div>

    <div class="section">
      <h2 style="margin-top: 0">Configured links</h2>
      <p v-if="loading" class="muted">Loading…</p>
      <p v-else-if="!links.length" class="muted">No links yet.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>URL</th>
            <th>Category</th>
            <th>Order</th>
            <th class="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="link in links" :key="link.id">
            <td>{{ link.title }}</td>
            <td>
              <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.url }}</a>
            </td>
            <td>{{ link.category || '—' }}</td>
            <td>{{ link.sortOrder }}</td>
            <td class="actions">
              <button type="button" @click="startEdit(link)">Edit</button>
              <button type="button" class="danger" style="margin-left: 0.35rem" @click="remove(link)">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
