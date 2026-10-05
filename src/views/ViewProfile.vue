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

// И главная, и плюс в таббаре начинают запись с первого шага: филиал → услуга
// → врач → дата и время.
function startBookingFlow() {
	startBooking()
	router.push('/service')
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

// Четыре ячейки записи в порядке макета: услуга, дата, время, врач.
function appointmentCells(appointment) {
	return [
		{ icon: NotebookPen, label: serviceTitle(appointment) },
		{ icon: CalendarDays, label: longDateLabel(appointment) },
		{ icon: Clock, label: timeRange(appointment) },
		{ icon: User, label: doctorName(appointment) || 'Врач не указан' },
	]
}

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
		<!-- Размеры с фреймов 60:399 и 66:2609 (393×852): карточка 374×263 со
		     скруглением 10, внутренние элементы — 5. -->
		<div class="p-[5px] rounded-card bg-card">
			<!-- Без записей аватар и имя по центру, с записями — строкой, чтобы
			     уместился слайдер. -->
			<div
				:class="
					hasAppointments
						? 'flex items-center gap-2.5'
						: 'flex flex-col items-center gap-2.5'
				"
				class="pb-2.5"
			>
				<img
					:src="clientPhoto || defaultPhoto"
					alt="Пациент"
					class="shrink-0 w-20 h-20 rounded-control object-cover object-center bg-brand"
				/>
				<div class="text-25 leading-[1.2] tracking-[-0.75px] text-gray-dark truncate">
					{{ clientName }}
				</div>
			</div>

			<UiLoader v-if="loading" label="Загружаем записи" class="py-2" />

			<div v-else-if="failed" class="py-2 text-13 text-center text-gray">
				Не удалось загрузить записи. Попробуйте позже.
			</div>

			<div v-else-if="!current.length" class="py-2 text-13 text-center text-gray">
				Активных записей нет — запишитесь на приём.
			</div>

			<!-- Разделитель во всю ширину карточки: вылезает за её внутренние 5px. -->
			<div v-show="hasAppointments" class="-mx-[5px] border-t border-hairline"></div>

			<div v-show="hasAppointments" class="relative flex items-center pt-[5px]">
				<button
					type="button"
					:disabled="!canScrollPrev"
					class="absolute left-0 z-10 flex items-center justify-center w-7.5 h-7.5 rounded-[3px] bg-card text-brand duration-60 active:scale-[0.92] disabled:opacity-30 disabled:pointer-events-none"
					aria-label="Предыдущая запись"
					@click="scrollPrev"
				>
					<ChevronLeft :size="26" :stroke-width="2.5" />
				</button>

				<div ref="emblaRef" class="grow overflow-hidden">
					<div class="flex">
						<!-- Четыре ячейки 180×75: услуга, дата, время, врач. -->
						<div
							v-for="appointment in current"
							:key="appointment.id"
							class="shrink-0 basis-full min-w-0 grid grid-cols-2 gap-[5px]"
						>
							<div
								v-for="cell in appointmentCells(appointment)"
								:key="cell.label"
								class="flex flex-col items-center justify-center gap-1 min-h-18.75 py-2 px-7 rounded-control bg-page text-16 leading-[1] tracking-[-0.96px] text-center text-gray"
							>
								<component
									:is="cell.icon"
									:size="18"
									:stroke-width="1.5"
									class="text-brand"
								/>
								<span class="line-clamp-2">{{ cell.label }}</span>
							</div>
						</div>
					</div>
				</div>

				<button
					type="button"
					:disabled="!canScrollNext"
					class="absolute right-0 z-10 flex items-center justify-center w-7.5 h-7.5 rounded-[3px] bg-card text-brand duration-60 active:scale-[0.92] disabled:opacity-30 disabled:pointer-events-none"
					aria-label="Следующая запись"
					@click="scrollNext"
				>
					<ChevronRight :size="26" :stroke-width="2.5" />
				</button>
			</div>

			<!-- Пока записи грузятся, кнопок нет: непонятно, появится ли под ними
			     слайдер, и «Записаться» прыгает вместе с ним.
			     С актуальной записью «Записаться» прячем (как в medix): человеку
			     сейчас нужно прийти на назначенный приём, а не завести новый.
			     Записаться всё равно можно плюсом в таббаре. В макете кнопка
			     нарисована и здесь — расхождение осознанное. -->
			<div v-if="!loading" class="flex gap-[5px] pt-[5px]">
				<UiBtn
					v-if="!hasAppointments"
					class="min-h-29.5 text-16 leading-[0.9] tracking-[-0.48px]"
					fluid
					@click="startBookingFlow"
				>
					Записаться
				</UiBtn>
				<UiBtn
					v-if="shownAppointment"
					color="secondary"
					:disabled="canceling"
					class="min-h-24.5 text-16 leading-[0.9] tracking-[-0.48px]"
					fluid
					@click="cancelShown"
				>
					{{ canceling ? 'Отменяем…' : 'Отменить запись' }}
				</UiBtn>
			</div>
		</div>

		<RouterLink
			to="/clinic"
			class="flex items-center justify-center min-h-27 p-5 rounded-control bg-card text-center text-20 font-bold leading-[0.9] tracking-[-0.6px] text-brand duration-60 active:scale-[0.98]"
		>
			Информация о клинике
		</RouterLink>
		<RouterLink
			to="/equipment"
			class="flex items-center justify-center min-h-27 p-5 rounded-control bg-card text-center text-20 font-bold leading-[0.9] tracking-[-0.6px] text-brand duration-60 active:scale-[0.98]"
		>
			Наше оборудование
		</RouterLink>

		<div class="flex flex-col items-center pt-1 space-y-1">
			<a
				:href="LEGAL_DOC"
				target="_blank"
				rel="noopener"
				class="text-20 leading-[1.2] tracking-[-0.6px] underline text-brand duration-60 active:scale-[0.96]"
				@click="openDocument($event, LEGAL_DOC)"
			>
				Правовая информация
			</a>
			<FeedbackDialog />
		</div>

		<UiTabbar />
	</div>
</template>
