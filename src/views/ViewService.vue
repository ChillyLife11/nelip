<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { RadioGroupRoot, RadioGroupItem } from 'reka-ui'
import UiBtn from '@/components/ui/UiBtn.vue'
import UiPageTitle from '@/components/ui/UiPageTitle.vue'
import UiLoader from '@/components/ui/UiLoader.vue'
import {
	getAllServices,
	getBranchesWithService,
	loadedAllServices,
	loadedBranchesWithService,
} from '@/api/branches'
import { useBooking } from '@/composables/useBooking'

const router = useRouter()
const { branchId, serviceId } = useBooking()

function fill(list) {
	services.value = list ?? []
	const keepSelected = services.value.some((s) => s.id === serviceId.value)
	selected.value = keepSelected ? serviceId.value : (services.value[0]?.id ?? null)
}

const services = ref([])
const failed = ref(false)
const selected = ref(null)

// При возврате назад филиалы уже в кеше — берём сразу, без запроса и лоадера.
const cached = loadedAllServices()
if (cached) fill(cached)
const loading = ref(!cached)

onMounted(async () => {
	if (!loading.value) return
	try {
		fill(await getAllServices())
	} catch (e) {
		console.warn('[service] branch/index failed', e)
		failed.value = true
	} finally {
		loading.value = false
	}
})

// Цена приходит отдельным полем строкой — «1000.00». В макете она стоит прямо
// в строке услуги через дефис: «Маммография - 1800 руб.». Копеек у цен нет,
// поэтому показываем целыми рублями.
function priceLabel(service) {
	const price = Number(service.price)
	return Number.isFinite(price) && price > 0 ? ` - ${Math.round(price)} руб.` : ''
}

// Отдельного шага выбора филиала нет: клиника одна. Подставляем первый филиал,
// где эта услуга есть, и идём к врачам. При входе через «Повторить» филиал уже
// стоит из прошлой записи — его не трогаем.
async function submit() {
	serviceId.value = selected.value
	if (!branchId.value) {
		const list =
			loadedBranchesWithService(selected.value) ??
			(await getBranchesWithService(selected.value))
		branchId.value = list[0]?.id ?? null
	}
	router.push('/doctors')
}
</script>

<template>
	<div class="min-h-screen flex flex-col p-2.5">
		<UiPageTitle>Выбрать направление</UiPageTitle>

		<UiLoader v-if="loading" label="Загружаем услуги" />

		<div v-else-if="failed" class="p-5 rounded-control bg-card text-13 text-gray">
			Не удалось загрузить услуги. Попробуйте позже.
		</div>

		<div v-else-if="!services.length" class="p-5 rounded-control bg-card text-13 text-gray">
			Услуги не найдены. Попробуйте позже.
		</div>

		<RadioGroupRoot v-else v-model="selected" class="space-y-2.5 pb-2.5">
			<RadioGroupItem
				v-for="service in services"
				:key="service.id"
				:value="service.id"
				class="flex items-center w-full min-h-10.75 py-3 px-[15px] rounded-control border border-transparent bg-card text-left text-15 leading-[1.1] text-brand duration-60 active:scale-[0.98] data-[state=checked]:border-brand data-[state=checked]:bg-card-darker"
			>
				{{ service.title }}{{ priceLabel(service) }}
			</RadioGroupItem>
		</RadioGroupRoot>

		<UiBtn
			:disabled="!selected"
			class="sticky bottom-7 left-0 min-h-17.75 mt-auto mb-4.5 text-16 leading-[0.9] tracking-[-0.8px]"
			fluid
			@click="submit"
		>
			Выбрать направление
		</UiBtn>
	</div>
</template>
