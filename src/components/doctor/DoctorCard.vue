<script setup>
defineProps({
	surname: String,
	name: String,
	specialty: String,
	date: String,
	// Ближайшие свободные часы: показываем их прямо в карточке, чтобы было
	// видно, когда врач принимает, ещё до экрана выбора времени.
	times: {
		type: Array,
		default: () => [],
	},
	photo: String,
	selected: Boolean,
})
</script>

<template>
	<button
		type="button"
		:class="selected ? 'bg-card-darker' : 'bg-card'"
		class="relative isolate w-full min-h-39 overflow-hidden rounded-control text-left duration-60 active:scale-[0.99]"
	>
		<!-- Размеры с фрейма 60:1280: карточка 373×157, текст 13/12px, плашки
		     времени 73×28, фото прижато вправо во всю высоту.
		     isolate обязателен: текстовый блок внутри лежит на z-10, а карточка без
		     своего контекста наложения выпускала его в общий — и он перекрывал
		     липкую кнопку внизу экрана, перехватывая тапы. -->
		<div class="relative z-10 py-5 pl-5 pr-38 space-y-0.5">
			<div class="text-13 font-bold leading-tight text-brand">{{ surname }}</div>
			<div v-if="name" class="text-13 leading-tight text-brand">{{ name }}</div>
			<div v-if="specialty" class="pt-1.5 text-12 leading-[1.2] text-gray line-clamp-3">
				{{ specialty }}
			</div>
			<div v-if="date" class="pt-1.5 text-12 text-brand whitespace-nowrap">
				Ближайшая запись: <span class="font-bold">{{ date }}</span>
			</div>
			<div v-if="times.length" class="flex flex-wrap gap-[5px] pt-2">
				<span
					v-for="(time, index) in times"
					:key="time"
					:class="
						index === 0
							? 'bg-brand text-brand-foreground'
							: 'border border-brand text-brand'
					"
					class="flex items-center justify-center w-18.25 h-7 rounded-control text-13"
				>
					{{ time }}
				</span>
			</div>
		</div>
		<!-- Снимок вписываем целиком (object-contain) — обрезать нельзя. -->
		<img
			:src="photo"
			alt=""
			class="absolute bottom-0 right-0 w-36 h-full object-contain object-right-bottom pointer-events-none"
		/>
	</button>
</template>
