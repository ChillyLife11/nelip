<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { RadioGroupRoot, RadioGroupItem } from 'reka-ui'
import UiBtn from '@/components/ui/UiBtn.vue'
import UiPageTitle from '@/components/ui/UiPageTitle.vue'
import UiLoader from '@/components/ui/UiLoader.vue'
import {
	getBranches,
	getBranchesWithService,
	loadedBranches,
	loadedBranchesWithService,
	shortAddress,
} from '@/api/branches'
import { useBooking } from '@/composables/useBooking'

const router = useRouter()
const { branchId, serviceId, isServiceFirst } = useBooking()

// Сценарий «сначала услуга»: услуга уже выбрана, поэтому показываем только те
// филиалы, где её оказывают. Если такой филиал один — в списке будет он один,
// но выбор всё равно за пользователем: филиал подсвечен, кнопку жмёт он.
const serviceFirst = isServiceFirst() && serviceId.value != null

const branches = ref([])
const failed = ref(false)
const selected = ref(null)

// Ранее выбранный филиал возвращаем, только если он есть в текущем списке:
// после смены услуги он мог из него выпасть.
function fill(list) {
	branches.value = list ?? []
	const keepSelected = branches.value.some((b) => b.id === branchId.value)
	selected.value = keepSelected ? branchId.value : (branches.value[0]?.id ?? null)
}

// При возврате назад филиалы уже в кеше — берём их сразу, без запроса и лоадера.
const cached = serviceFirst ? loadedBranchesWithService(serviceId.value) : loadedBranches()
if (cached) fill(cached)
const loading = ref(!cached)

onMounted(async () => {
	if (!loading.value) return
	try {
		fill(serviceFirst ? await getBranchesWithService(serviceId.value) : await getBranches())
	} catch (e) {
		console.warn('[branch] index failed', e)
		failed.value = true
	} finally {
		loading.value = false
	}
})

// В сценарии «сначала услуга» она уже выбрана — сразу идём к врачам.
function submit() {
	branchId.value = selected.value
	router.push(serviceFirst ? '/doctors' : '/service')
}
</script>

<template>
	<div class="min-h-screen flex flex-col p-2.5">
		<UiPageTitle>Выбрать филиал</UiPageTitle>

		<UiLoader v-if="loading" label="Загружаем филиалы" />

		<div v-else-if="failed" class="p-5 rounded-control bg-card text-13 text-gray">
			Не удалось загрузить филиалы. Попробуйте позже.
		</div>

		<div v-else-if="!branches.length" class="p-5 rounded-control bg-card text-13 text-gray">
			<template v-if="serviceFirst">
				Эту услугу пока не оказывают ни в одном филиале — выберите другую.
			</template>
			<template v-else>Филиалы не найдены.</template>
		</div>

		<template v-else>
			<!-- Услуга есть только в одном филиале — говорим об этом, выбор всё
			     равно за человеком. -->
			<div v-if="serviceFirst && branches.length === 1" class="mb-2.5 text-13 text-gray">
				Выбранная услуга доступна только в этом филиале
			</div>

			<!-- Своего фрейма у этого экрана в макете нет (филиал там не
			     выбирается вовсе), поэтому плашки повторяют строки списка с
			     «Выбрать направление»: 5px, брендовый текст, выбранная темнее. -->
			<RadioGroupRoot v-model="selected" class="space-y-2.5 pb-2.5">
				<RadioGroupItem
					v-for="branch in branches"
					:key="branch.id"
					:value="branch.id"
					class="flex items-center w-full min-h-10.75 py-3 px-[15px] rounded-control bg-card text-left text-15 leading-[1.1] text-brand duration-60 active:scale-[0.98] data-[state=checked]:bg-card-darker"
				>
					{{ shortAddress(branch) }}
				</RadioGroupItem>
			</RadioGroupRoot>
		</template>

		<UiBtn
			:disabled="!selected"
			class="sticky bottom-2 left-0 min-h-17.75 mt-auto mb-2 text-16 leading-[0.9] tracking-[-0.8px]"
			fluid
			@click="submit"
		>
			Выбрать филиал
		</UiBtn>
	</div>
</template>
