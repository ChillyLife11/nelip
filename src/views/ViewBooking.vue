<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiLoader from '@/components/ui/UiLoader.vue'
import UiBtn from '@/components/ui/UiBtn.vue'
import { getBranches, loadedBranches, shortAddress } from '@/api/branches'
import { useBooking } from '@/composables/useBooking'

// Логотип клиники из макета — лежит рядом со сборкой, в public/images.
const logo = `${import.meta.env.BASE_URL}images/logo-nelip.png`

// Экран записи — хаб: три плитки (услуга, врач, дата и время) и шапка с
// клиникой. Шаги можно проходить в любом порядке, поэтому отдельного экрана
// выбора филиала нет: клиника одна, филиал подставляем сами.
const router = useRouter()
const { branchId, serviceId, masterId, date, time } = useBooking()

const branch = ref(null)
const failed = ref(false)

// Филиал у клиники один: выбирать нечего, просто запоминаем его в флоу.
function fill(list) {
	branch.value = list?.[0] ?? null
	branchId.value = branch.value?.id ?? null
}

const cached = loadedBranches()
if (cached) fill(cached)
const loading = ref(!cached)

onMounted(async () => {
	if (!loading.value) return
	try {
		fill(await getBranches())
	} catch (e) {
		console.warn('[booking] branch/index failed', e)
		failed.value = true
	} finally {
		loading.value = false
	}
})

const serviceTitle = computed(
	() => (branch.value?.services ?? []).find((s) => s.id === serviceId.value)?.title ?? '',
)

// ФИО врача приходит перепутанным: фамилия в first_name, имя в last_name.
const doctorTitle = computed(() => {
	const doctor = (branch.value?.coworkers ?? []).find((c) => c.id === masterId.value)
	if (!doctor) return ''
	const profile = doctor.profile ?? {}
	return (
		[profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || doctor.username
	)
})

const datetimeTitle = computed(() => {
	if (!date.value) return ''
	const [year, month, day] = date.value.split('-')
	return [`${day}.${month}.${year}`, time.value].filter(Boolean).join(' / ')
})

// Плитка показывает выбранное значение, а пока пусто — свою подсказку.
const steps = computed(() => [
	{ prompt: 'Выбрать услугу', value: serviceTitle.value, to: '/service' },
	{ prompt: 'Выбрать врача', value: doctorTitle.value, to: '/doctors' },
	{ prompt: 'Выбрать дату и время', value: datetimeTitle.value, to: '/datetime', wide: true },
])

// Кнопка внизу ведёт в первый незаполненный шаг — так человек проходит их
// подряд, но может и перескочить, ткнув в нужную плитку.
const nextStep = computed(() => steps.value.find((step) => !step.value) ?? steps.value[2])
</script>

<template>
	<div class="min-h-screen flex flex-col p-2.5">
		<h1 class="text-20 leading-[1] tracking-[-0.6px] font-bold text-brand mb-5">Записаться</h1>

		<UiLoader v-if="loading" label="Загружаем клинику" />

		<div v-else-if="failed" class="p-5 rounded-control bg-card text-13 text-gray">
			Не удалось загрузить данные клиники. Попробуйте позже.
		</div>

		<template v-else>
			<div class="flex items-center gap-[15px] mb-5">
				<img :src="logo" alt="" class="shrink-0 w-7.5 h-7.5 rounded-control object-cover" />
				<div class="leading-[1.2]">
					<div class="text-12 text-brand">{{ branch?.title }}</div>
					<div class="text-12 text-gray">{{ shortAddress(branch) }}</div>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-2.5">
				<button
					v-for="step in steps"
					:key="step.to"
					type="button"
					:class="[
						step.wide ? 'col-span-2' : '',
						step.value ? 'bg-card-darker' : 'bg-card',
					]"
					class="flex items-center justify-center min-h-25 p-5 rounded-control text-center text-13 text-brand duration-60 active:scale-[0.98]"
					@click="router.push(step.to)"
				>
					{{ step.value || step.prompt }}
				</button>
			</div>
		</template>

		<UiBtn
			class="sticky bottom-2 left-0 z-10 min-h-17.75 mt-auto mb-2 text-20 leading-[0.9] tracking-[-0.6px]"
			fluid
			@click="router.push(nextStep.to)"
		>
			Выбрать
		</UiBtn>
	</div>
</template>
