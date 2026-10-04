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

		<!-- Размеры с фрейма 237:2711: карточка 373×529, под фото белая подложка
		     363×244, название 15px, описание 13px с межстрочным 1.4. -->
		<div v-else class="p-[5px] rounded-control bg-card">
			<div class="flex items-center justify-center h-61 p-2.5 rounded-control bg-page">
				<img v-if="item.photo" :src="item.photo" alt="" class="max-h-full object-contain" />
			</div>
			<div class="p-[15px] space-y-2.5">
				<div class="text-15 font-bold leading-[0.9] text-brand">{{ item.title }}</div>
				<p
					v-for="text in item.paragraphs"
					:key="text"
					class="text-13 leading-[1.4] tracking-[-0.39px] text-black/70"
				>
					{{ text }}
				</p>
				<div
					v-if="item.advantages.length"
					class="text-13 leading-[1.4] tracking-[-0.39px] text-black/70"
				>
					<div>Преимущества:</div>
					<div v-for="line in item.advantages" :key="line">{{ line }}</div>
				</div>
				<p v-if="!item.paragraphs.length" class="text-13 leading-[1.4] text-black/70">
					Описание появится позже.
				</p>
			</div>
		</div>

		<UiTabbar />
	</div>
</template>
