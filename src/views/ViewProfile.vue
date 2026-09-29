<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import emblaCarouselVue from 'embla-carousel-vue'
import UiBtn from '@/components/ui/UiBtn.vue'
import UiLoader from '@/components/ui/UiLoader.vue'
import FeedbackDialog from '@/components/feedback/FeedbackDialog.vue'
import UiTabbar from '@/components/ui/UiTabbar.vue'
import {
	useAppointments,
	serviceTitle,
	doctorName,
	longDateLabel,
	timeRange,
} from '@/composables/useAppointments'
import { NotebookPen, CalendarDays, Clock, User, ChevronLeft, ChevronRight } from '@lucide/vue'
import { useBooking } from '@/composables/useBooking'
import { useAuth } from '@/composables/useAuth'
import { useMessenger } from '@/composables/useMessenger'
import { appUrl } from '@/config'

const router = useRouter()
const { startBooking } = useBooking()
// Имя и аватар пациента — из аккаунта MAX, иначе из карточки клиента на бэкенде
// (см. useAuth). Если фото нет нигде, показываем заглушку из public/images.
const { clientName, clientPhoto } = useAuth()
const defaultPhoto = `${import.meta.env.BASE_URL}images/doctor-img.png`

// «Правовая информация» — документ рядом со сборкой, в папке компании.
// Внутри MAX PDF не отрисовывается, а скачивается, поэтому зовём openLink() и
// файл показывает системный браузер.
const { openLink } = useMessenger()
const LEGAL_DOC = appUrl('policy.pdf')

function openDocument(event, url) {
	if (openLink(url)) event.preventDefault()
}

// Запись одна на всё приложение: клиника одна, филиал подставляется сам,
// поэтому и главная, и плюс в таббаре ведут на экран-хаб.
function startBookingFlow() {
	startBooking('branch')
	router.push('/booking')
}

// Актуальные записи в слайдере: по одной на слайд, листаются стрелками.
// Берём current, а не весь список: прошедшие и отменённые живут в истории.
const { current, loading, failed, load, cancel, canceling } = useAppointments('current')

const [emblaRef, emblaApi] = emblaCarouselVue({ loop: false, align: 'center' })

const scrollPrev = () => emblaApi.value?.scrollPrev()
const scrollNext = () => emblaApi.value?.scrollNext()

// Без зацикливания на краях листать некуда — гасим соответствующую стрелку.
const canScrollPrev = ref(false)
const canScrollNext = ref(false)

// Отменяем ту запись, которая сейчас на экране, — держим её индекс.
const currentSlide = ref(0)

function syncArrows() {
	canScrollPrev.value = emblaApi.value?.canScrollPrev() ?? false
	canScrollNext.value = emblaApi.value?.canScrollNext() ?? false
	currentSlide.value = emblaApi.value?.selectedScrollSnap() ?? 0
}

const shownAppointment = computed(() => current.value[currentSlide.value] ?? null)

async function cancelShown() {
	if (!shownAppointment.value) return
	if (await cancel(shownAppointment.value.id)) {
		await nextTick()
		emblaApi.value?.reInit()
		syncArrows()
	}
}

const hasAppointments = computed(() => !loading.value && !failed.value && current.value.length)

// Слайдер держим в DOM всегда (прячем через v-show): embla инициализируется
// один раз в onMounted и не подхватил бы контейнер, появившийся после запроса.
// После загрузки пересчитываем размеры — слайды к этому моменту уже отрисованы.
onMounted(async () => {
	await load()
	await nextTick()
	emblaApi.value?.reInit()
	emblaApi.value?.on('select', syncArrows).on('reInit', syncArrows)
	syncArrows()
})
</script>

<template>
	<div class="min-h-screen flex flex-col p-2.5 space-y-2.5">
		<div class="p-2.5 rounded-card bg-card">
			<!-- Пока записей нет, аватар и имя стоят по центру; с записями шапка
			     сжимается в строку, чтобы уместить слайдер. -->
			<div
				:class="
					hasAppointments
						? 'flex items-center gap-4'
						: 'flex flex-col items-center gap-2.5'
				"
				class="pb-2.5"
			>
				<img
					:src="clientPhoto || defaultPhoto"
					alt="Пациент"
					:class="hasAppointments ? 'w-20 h-20' : 'w-25 h-25'"
					class="shrink-0 rounded-card object-cover object-center bg-brand"
				/>
				<div class="text-2xl text-gray truncate">{{ clientName }}</div>
			</div>

			<UiLoader v-if="loading" label="Загружаем записи" class="py-2" />

			<div v-else-if="failed" class="py-2 text-13 text-center text-gray">
				Не удалось загрузить записи. Попробуйте позже.
			</div>

			<div v-else-if="!current.length" class="py-2 text-13 text-center text-gray">
				Активных записей нет — запишитесь на приём.
			</div>

			<div
				v-show="hasAppointments"
				class="flex items-center gap-1 border-t border-page pt-2.5"
			>
				<button
					type="button"
					:disabled="!canScrollPrev"
					class="shrink-0 -ml-1 text-brand duration-60 active:scale-[0.92] disabled:opacity-30 disabled:pointer-events-none"
					aria-label="Предыдущая запись"
					@click="scrollPrev"
				>
					<ChevronLeft :size="26" :stroke-width="2" />
				</button>

				<div ref="emblaRef" class="grow overflow-hidden">
					<div class="flex">
						<!-- Четыре ячейки: услуга, дата, время, врач — каждая со своей
						     иконкой, как в макете. -->
						<div
							v-for="appointment in current"
							:key="appointment.id"
							class="shrink-0 basis-full min-w-0 grid grid-cols-2 gap-2"
						>
							<div
								class="flex flex-col items-center justify-center gap-1 min-h-24 p-2 rounded-control bg-page text-13 text-center text-gray"
							>
								<NotebookPen :size="20" :stroke-width="1.5" class="text-brand" />
								<span class="line-clamp-2">{{ serviceTitle(appointment) }}</span>
							</div>
							<div
								class="flex flex-col items-center justify-center gap-1 min-h-24 p-2 rounded-control bg-page text-13 text-center text-gray"
							>
								<CalendarDays :size="20" :stroke-width="1.5" class="text-brand" />
								<span class="line-clamp-2">{{ longDateLabel(appointment) }}</span>
							</div>
							<div
								class="flex flex-col items-center justify-center gap-1 min-h-24 p-2 rounded-control bg-page text-13 text-center text-gray"
							>
								<Clock :size="20" :stroke-width="1.5" class="text-brand" />
								<span>{{ timeRange(appointment) }}</span>
							</div>
							<div
								class="flex flex-col items-center justify-center gap-1 min-h-24 p-2 rounded-control bg-page text-13 text-center text-gray"
							>
								<User :size="20" :stroke-width="1.5" class="text-brand" />
								<span class="line-clamp-2">
									{{ doctorName(appointment) || 'Врач не указан' }}
								</span>
							</div>
						</div>
					</div>
				</div>

				<button
					type="button"
					:disabled="!canScrollNext"
					class="shrink-0 -mr-1 text-brand duration-60 active:scale-[0.92] disabled:opacity-30 disabled:pointer-events-none"
					aria-label="Следующая запись"
					@click="scrollNext"
				>
					<ChevronRight :size="26" :stroke-width="2" />
				</button>
			</div>

			<!-- Пока записи грузятся, кнопок нет: непонятно, появится ли под ними
			     слайдер, и «Записаться» прыгает вместе с ним.
			     С актуальной записью «Записаться» прячем (как в medix): человеку
			     сейчас нужно прийти на назначенный приём, а не завести новый.
			     Записаться всё равно можно плюсом в таббаре. В макете кнопка
			     нарисована и здесь — расхождение осознанное. -->
			<div v-if="!loading" class="flex gap-2.5 pt-2.5">
				<UiBtn v-if="!hasAppointments" fluid @click="startBookingFlow">Записаться</UiBtn>
				<UiBtn
					v-if="shownAppointment"
					color="secondary"
					:soft="canceling"
					:disabled="canceling"
					fluid
					@click="cancelShown"
				>
					{{ canceling ? 'Отменяем…' : 'Отменить запись' }}
				</UiBtn>
			</div>
		</div>

		<RouterLink
			to="/clinic"
			class="flex items-center justify-center min-h-25 p-5 rounded-card bg-card text-center text-2xl text-brand duration-60 active:scale-[0.98]"
		>
			Информация о клинике
		</RouterLink>
		<RouterLink
			to="/equipment"
			class="flex items-center justify-center min-h-25 p-5 rounded-card bg-card text-center text-2xl text-brand duration-60 active:scale-[0.98]"
		>
			Наше оборудование
		</RouterLink>

		<div class="flex flex-col items-center pt-1 space-y-1">
			<a
				:href="LEGAL_DOC"
				target="_blank"
				rel="noopener"
				class="text-[17px] underline text-brand duration-60 active:scale-[0.96]"
				@click="openDocument($event, LEGAL_DOC)"
			>
				Правовая информация
			</a>
			<FeedbackDialog />
		</div>

		<UiTabbar />
	</div>
</template>
