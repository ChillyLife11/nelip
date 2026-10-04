<script setup>
import { useRouter } from 'vue-router'
import { markBack } from '@/router/direction'

// Заголовок экрана: слева название 20px, справа «‹ Назад» 13px — так во всех
// внутренних экранах макета (фреймы 60:1111, 60:1389 и др.).
const $props = defineProps({
	to: [String, Object],
})

const router = useRouter()

// С явным адресом это всё равно шаг назад — помечаем, иначе экран приехал бы
// снизу, как при движении вперёд (см. @/router/direction).
function back() {
	if (!$props.to) return router.back()
	markBack()
	router.push($props.to)
}
</script>

<template>
	<div class="flex items-center justify-between gap-2 mb-5">
		<h1 class="text-22 leading-[0.9] text-brand"><slot /></h1>
		<button
			type="button"
			class="shrink-0 text-14 leading-[0.9] tracking-[-0.42px] text-[rgba(151,151,151,0.7)] duration-60 active:scale-[0.96]"
			@click="back"
		>
			‹ Назад
		</button>
	</div>
</template>
