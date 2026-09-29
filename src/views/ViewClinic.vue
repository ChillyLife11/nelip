<script setup>
import UiPageTitle from '@/components/ui/UiPageTitle.vue'
import UiTabbar from '@/components/ui/UiTabbar.vue'
import { clinicInfo } from '@/content/clinic'
</script>

<template>
	<div class="min-h-screen flex flex-col p-2.5">
		<UiPageTitle to="/profile">Информация о клинике</UiPageTitle>

		<div class="p-[5px] rounded-control bg-card">
			<img :src="clinicInfo.photo" alt="" class="w-full rounded-control object-cover" />
			<div class="p-[15px] space-y-2.5">
				<div class="text-13 font-bold text-brand">{{ clinicInfo.title }}</div>
				<p
					v-for="text in clinicInfo.paragraphs"
					:key="text"
					class="text-12 leading-[1.5] text-gray"
				>
					{{ text }}
				</p>
			</div>
		</div>

		<UiTabbar />
	</div>
</template>
