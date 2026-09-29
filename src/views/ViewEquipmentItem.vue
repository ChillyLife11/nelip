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

		<div v-if="!item" class="p-5 rounded-control bg-card text-13 text-gray">
			Такого аппарата нет — вернитесь к списку.
		</div>

		<div v-else class="p-[5px] rounded-control bg-card">
			<img :src="item.photo" alt="" class="w-full rounded-control object-cover" />
			<div class="p-[15px] space-y-2.5">
				<div class="text-13 font-bold text-brand">{{ item.title }}</div>
				<p
					v-for="text in item.paragraphs"
					:key="text"
					class="text-12 leading-[1.5] text-gray"
				>
					{{ text }}
				</p>
				<div v-if="item.advantages.length" class="text-12 leading-[1.5] text-gray">
					<div>Преимущества:</div>
					<div v-for="line in item.advantages" :key="line">{{ line }}</div>
				</div>
			</div>
		</div>

		<UiTabbar />
	</div>
</template>
