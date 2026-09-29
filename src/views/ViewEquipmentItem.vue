<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import UiPageTitle from '@/components/ui/UiPageTitle.vue'
import UiTabbar from '@/components/ui/UiTabbar.vue'
import { equipmentItem } from '@/content/clinic'

const route = useRoute()
const item = computed(() => equipmentItem(route.params.id))
</script>

<template>
	<div class="min-h-screen flex flex-col p-2.5">
		<UiPageTitle to="/equipment">Наше оборудование</UiPageTitle>

		<div v-if="!item" class="p-5 rounded-card bg-card text-15 text-gray">
			Такого аппарата нет — вернитесь к списку.
		</div>

		<div v-else class="rounded-card bg-card overflow-hidden">
			<div class="p-1.5 bg-page">
				<img :src="item.photo" alt="" class="w-full rounded-card" />
			</div>
			<div class="p-4 space-y-3">
				<div class="text-[17px] text-brand">{{ item.title }}</div>
				<p
					v-for="text in item.paragraphs"
					:key="text"
					class="text-15 text-gray leading-snug"
				>
					{{ text }}
				</p>
				<div v-if="item.advantages.length" class="text-15 text-gray leading-snug">
					<div>Преимущества:</div>
					<div v-for="line in item.advantages" :key="line">{{ line }}</div>
				</div>
			</div>
		</div>

		<UiTabbar />
	</div>
</template>
