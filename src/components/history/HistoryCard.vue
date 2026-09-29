<script setup>
import { computed } from 'vue'
import { X, Check, RotateCw } from '@lucide/vue'

const $props = defineProps({
	service: String,
	doctor: String,
	date: String,
	// 'complete' — выполнена, 'canceled' — отменена, 'pending' — все остальные
	// статусы: лист ожидания, отправлена в МИС, напоминание, подтверждена.
	status: {
		type: String,
		default: 'pending',
	},
})

// «Повторить» — новая запись к тому же врачу на ту же услугу; куда вести,
// решает экран со списком.
defineEmits(['repeat'])

// В макете три вида: зелёная галочка, красный крест и оранжевая стрелка-повтор.
const icon = computed(() => {
	switch ($props.status) {
		case 'complete':
			return Check
		case 'canceled':
			return X
		default:
			return RotateCw
	}
})
</script>

<template>
	<!-- Размеры с фрейма 60:1163: карточка 373×200, внутри три белые строки по
	     60px с зазором 5, иконка статуса 45×45, «Повторить» 167×50. -->
	<div class="p-[5px] space-y-[5px] rounded-control bg-card">
		<div class="relative flex items-center justify-center h-15 px-14 rounded-control bg-page">
			<span class="text-13 text-center text-gray line-clamp-2">{{ $props.service }}</span>
			<div
				:class="{
					'text-[#34C759]': $props.status === 'complete',
					'text-[#FF3B30]': $props.status === 'canceled',
					'text-[#FF9500]': $props.status === 'pending',
				}"
				class="absolute right-2 flex items-center justify-center w-11.25 h-11.25 rounded-control bg-card"
			>
				<component :is="icon" :size="20" :stroke-width="2" />
			</div>
		</div>

		<div
			v-if="$props.doctor"
			class="flex items-center justify-center h-15 px-5 rounded-control bg-page"
		>
			<span class="text-13 text-center text-gray line-clamp-2"
				>Врач: {{ $props.doctor }}</span
			>
		</div>

		<div class="flex items-center justify-between h-15 pl-5 pr-[5px] rounded-control bg-page">
			<span class="text-13 text-gray whitespace-nowrap">{{ $props.date }}</span>
			<button
				type="button"
				class="flex items-center justify-center w-41.75 h-12.5 rounded-control border border-brand text-13 text-brand duration-40 active:scale-[0.98]"
				@click="$emit('repeat')"
			>
				Повторить
			</button>
		</div>
	</div>
</template>
