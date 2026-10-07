<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AgreeDialog from '@/components/auth/AgreeDialog.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const base = import.meta.env.BASE_URL
const { checkAuth } = useAuth()

// Согласия показываем окном поверх сплэша, а не отдельной страницей: экран
// загрузки остаётся фоном, пока клиент не опознан.
const agreeing = ref(false)

// Сплэш держим на экране не меньше двух секунд, даже если клиент опознался
// быстрее: иначе логотип мелькает и запуск выглядит дёрганым.
const MIN_SPLASH_MS = 2000
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

onMounted(async () => {
	// Есть сохранённая сессия или телефон — сразу в профиль,
	// иначе просим согласия и номер телефона.
	// Проверку и паузу ждём вместе: медленный ответ сплэш не удлиняет.
	const [state] = await Promise.all([checkAuth(), wait(MIN_SPLASH_MS)])
	if (state === 'authed') router.replace('/profile')
	else agreeing.value = true
})
</script>

<template>
	<div
		class="relative flex min-h-screen flex-col items-center justify-center gap-15 px-2.5 bg-loading-page"
	>
		<!-- Фон загрузки держим на корне экрана, а не на body: глобальный <style>
		     красил body один раз и навсегда, и голубоватый фон оставался на всех
		     остальных экранах — они белые. Комментарий обязан быть ВНУТРИ корня:
		     перед ним шаблон становится фрагментом и <Transition> в App.vue
		     перестаёт работать (экран после сплэша остаётся пустым). -->
		<!-- Раскладка с макета (фрейм 393×852): логотип 315px сверху, под ним
		     заголовок 50px с плотным межстрочным. Держим пропорции, а не пиксели:
		     экраны бывают уже 393. -->
		<img
			:src="`${base}images/logo-nelip.png`"
			alt="Клиника доктора Нелип"
			class="w-4/5 max-w-[315px] object-contain"
		/>
		<p class="max-w-[311px] text-center text-[50px] leading-[0.8] tracking-[-1.5px] text-brand">
			Добро пожаловать
		</p>

		<!-- Крутилка внизу: экран висит минимум две секунды, без неё запуск
		     выглядит зависшим. В макете её нет — оставлена сознательно. -->
		<span
			class="absolute bottom-20 block w-10 h-10 rounded-full border-4 border-brand/20 border-t-brand animate-spin"
			role="status"
			aria-label="Загружаем"
		/>

		<AgreeDialog v-model:open="agreeing" @signed="router.replace('/profile')" />
	</div>
</template>
