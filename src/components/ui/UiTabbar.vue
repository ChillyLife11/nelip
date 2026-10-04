<script setup>
import { useRoute, useRouter } from 'vue-router'
import { House, Plus, GalleryHorizontalEnd } from '@lucide/vue'
import { useBooking } from '@/composables/useBooking'

const route = useRoute()
const router = useRouter()
const { startBooking } = useBooking()

// Плюс ведёт на экран записи — оттуда выбирают услугу, врача или время.
function startBookingFlow() {
	startBooking('branch')
	router.push('/booking')
}

// На своём же экране кнопка никуда не ведёт.
const go = (path) => route.path !== path && router.push(path)

// Текущий экран подсвечиваем брендовым цветом иконки — заливка у боковых
// кнопок в макете всегда белая.
const iconColor = (path) => (route.path === path ? 'text-brand' : 'text-gray')
</script>

<template>
	<div class="sticky bottom-5 z-10 mt-auto pt-2.5">
		<!-- sticky, а не fixed: плашка остаётся в потоке, контент под ней не
		     прячется. mt-auto прижимает её к низу, когда контента меньше экрана. -->
		<div class="flex items-center justify-between h-22.25 px-4 rounded-bar bg-bar">
			<button
				type="button"
				aria-label="Главная"
				:class="iconColor('/profile')"
				class="flex items-center justify-center w-14 h-14 rounded-full bg-page duration-60 active:scale-[0.94]"
				@click="go('/profile')"
			>
				<House stroke-width="1.3" size="27" />
			</button>

			<button
				type="button"
				aria-label="Записаться"
				class="flex items-center justify-center w-14 h-14 rounded-full bg-brand text-brand-foreground duration-60 active:scale-[0.94]"
				@click="startBookingFlow"
			>
				<Plus stroke-width="2" size="31" />
			</button>

			<button
				type="button"
				aria-label="История посещений"
				:class="iconColor('/active')"
				class="flex items-center justify-center w-14 h-14 rounded-full bg-page duration-60 active:scale-[0.94]"
				@click="go('/active')"
			>
				<GalleryHorizontalEnd stroke-width="1.3" size="27" />
			</button>
		</div>
	</div>
</template>
