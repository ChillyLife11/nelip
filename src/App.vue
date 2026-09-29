<script setup>
import { ref } from 'vue'
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
// Поэтому на скрытой вкладке рендерим экран вообще без <Transition> — смена
// происходит сразу, без анимации и без ожидания кадра. Убирать нельзя.
const hidden = ref(document.visibilityState === 'hidden')
document.addEventListener('visibilitychange', () => {
	hidden.value = document.visibilityState === 'hidden'
})
</script>

<template>
	<!-- ВРЕМЕННО: отладочные тосты с обменом по API, см. DEBUG_HTTP в @/config -->
	<HttpToasts v-if="DEBUG_HTTP" />

	<div class="flex min-h-screen *:w-full">
		<RouterView v-slot="{ Component }">
			<!-- На скрытой вкладке переход не используем вовсе: без него экран
			     меняется сразу, с ним — застревает (см. комментарий в скрипте). -->
			<Transition v-if="!hidden" :name="direction" mode="out-in">
				<component :is="Component" :key="route.fullPath" />
			</Transition>
			<component :is="Component" v-else :key="route.fullPath" />
		</RouterView>
	</div>
</template>
