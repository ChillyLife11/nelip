<script setup>
import { useRouter } from 'vue-router'

// Заголовок экрана: слева название, справа «‹ Назад» — так во всех внутренних
// экранах макета. По умолчанию шаг назад по истории; to — уйти на конкретный.
const $props = defineProps({
	to: [String, Object],
})

const router = useRouter()

const back = () => ($props.to ? router.push($props.to) : router.back())
</script>

<template>
	<div class="flex items-end justify-between gap-2 mb-5">
		<h1 class="text-[26px] leading-[1.1] text-brand"><slot /></h1>
		<button
			type="button"
			class="shrink-0 pb-1 text-[17px] text-gray duration-60 active:scale-[0.96]"
			@click="back"
		>
			‹ Назад
		</button>
	</div>
</template>
