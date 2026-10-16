<script setup>
import { computed, ref } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import HttpToasts from '@/components/debug/HttpToasts.vue'
import { DEBUG_HTTP } from '@/config'
import { takeBackIntent } from '@/router/direction'

const router = useRouter()
const route = useRoute()

// направление перехода: вперёд — экран выезжает снизу, назад — сверху
const direction = ref('slide-up')
let lastPosition = window.history.state?.position ?? 0

router.afterEach(() => {
	const current = window.history.state?.position ?? 0
	// Назад — либо шаг по истории (позиция уменьшилась), либо явно помеченный
	// переход по кнопке «Назад» в шапке (там push, позиция растёт).
	const back = takeBackIntent() || current < lastPosition
	direction.value = back ? 'slide-down' : 'slide-up'
	lastPosition = current
})

// В фоновой вкладке браузер не вызывает requestAnimationFrame, а Vue именно им
// ведёт CSS-анимацию перехода: она застывает на `enter-from` с opacity 0, и
// экран остаётся пустым навсегда — даже когда вкладку вернули. Это не гипотеза:
// воспроизведено в браузере (сплэш висит две секунды, и если за это время уйти
// на другую вкладку, приложение больше не покажет ничего).
// Поэтому на скрытой вкладке переход идёт без CSS (`:css="false"`), а завершаем
// мы его сами — хуками, которые сразу зовут `done`. Одного `:css` мало: без
// хуков Vue некому сказать, что анимация кончилась, и экран не появляется вовсе
// (проверено — в `<div>` остаётся только комментарий).
// Хуки вешаем только на скрытой вкладке и целым объектом: Vue смотрит на число
// аргументов хука и, увидев `done`, перестаёт ждать конца CSS-перехода — на
// видимой вкладке это оборвало бы анимацию на первом кадре.
// ⚠️ Ветку шаблона при этом менять нельзя. Раньше здесь стояло `v-if="!hidden"`
// с голым <component> во второй ветке, и каждое переключение вкладки меняло
// ветку — Vue пересоздавал экран, а вместе с ним терялось его состояние:
// открытое окно об успешной записи исчезало при уходе на соседнюю вкладку.
const hidden = ref(document.visibilityState === 'hidden')
document.addEventListener('visibilitychange', () => {
	hidden.value = document.visibilityState === 'hidden'
})

// `done` зовём микрозадачей, а не сразу: синхронный вызов внутри onLeave
// роняет Vue на mode="out-in" (TypeError «parentNode of null»), и экран
// остаётся пустым. Микрозадача, а не setTimeout: таймеры в фоновой вкладке
// Chrome тормозит до секунды.
const instantly = (el, done) => queueMicrotask(done)
const hiddenHooks = computed(() => (hidden.value ? { onEnter: instantly, onLeave: instantly } : {}))
</script>

<template>
	<!-- ВРЕМЕННО: отладочные тосты с обменом по API, см. DEBUG_HTTP в @/config -->
	<HttpToasts v-if="DEBUG_HTTP" />

	<div class="flex min-h-screen *:w-full">
		<RouterView v-slot="{ Component }">
			<!-- На скрытой вкладке переход идёт без CSS и завершается хуками:
			     кадров анимации там нет (см. комментарий в скрипте). Ветку
			     шаблона при этом не меняем — иначе экран пересоздаётся. -->
			<Transition :name="direction" :css="!hidden" v-bind="hiddenHooks" mode="out-in">
				<component :is="Component" :key="route.fullPath" />
			</Transition>
		</RouterView>
	</div>
</template>
