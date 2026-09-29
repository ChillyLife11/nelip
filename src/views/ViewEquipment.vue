<script setup>
import { useRouter } from 'vue-router'
import UiPageTitle from '@/components/ui/UiPageTitle.vue'
import UiTabbar from '@/components/ui/UiTabbar.vue'
import { equipment } from '@/content/clinic'

const router = useRouter()
</script>

<template>
	<div class="min-h-screen flex flex-col p-2.5">
		<UiPageTitle to="/profile">Наше оборудование</UiPageTitle>

		<div class="space-y-2.5">
			<button
				v-for="item in equipment"
				:key="item.id"
				type="button"
				class="flex items-center w-full min-h-17 py-4 px-5 rounded-card bg-card text-left text-[17px] text-brand duration-60 active:scale-[0.98] active:bg-card-darker"
				@click="router.push(`/equipment/${item.id}`)"
			>
				{{ item.title }}
			</button>
		</div>

		<UiTabbar />
	</div>
</template>
