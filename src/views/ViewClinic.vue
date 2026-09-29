<script setup>
import UiPageTitle from '@/components/ui/UiPageTitle.vue'
import UiTabbar from '@/components/ui/UiTabbar.vue'
import { clinicInfo } from '@/content/clinic'
</script>

<template>
	<div class="min-h-screen flex flex-col p-2.5">
		<UiPageTitle to="/profile">Информация о клинике</UiPageTitle>

		<div class="rounded-card bg-card overflow-hidden">
			<div class="p-1.5 bg-page">
				<img :src="clinicInfo.photo" alt="" class="w-full rounded-card" />
			</div>
			<div class="p-4 space-y-3">
				<div class="text-[17px] text-brand">{{ clinicInfo.title }}</div>
				<p
					v-for="text in clinicInfo.paragraphs"
					:key="text"
					class="text-15 text-gray leading-snug"
				>
					{{ text }}
				</p>
			</div>
		</div>

		<UiTabbar />
	</div>
</template>
