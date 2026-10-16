import { api } from '@/api/http'

// Расписание специалиста. Сам список врачей приходит внутри филиала
// (см. @/api/branches), отдельного запроса за сотрудниками нет.

// Свободные слоты специалиста на дату (date = YYYY-MM-DD).
// master_id уезжает в параметре user_id — так его называет сам эндпоинт.
// Ответ: { "2026-08-14": { "239": ["09:00", "09:30", ...] } } — внешний ключ
// это дата, внутренний приходит от бэка (кабинет/ресурс).
export function getSchedule({ masterId, branchId, date }) {
	return api
		.get('/coworker/get-schedule', {
			params: { user_id: masterId, branch_id: branchId, date },
		})
		.then((r) => r.data ?? {})
}

// ФИО сотрудника лежит во вложенном profile: last_name — фамилия, first_name —
// имя, second_name — отчество (бэкенд добавил отчество 16.10.2026 и тогда же
// подтвердил порядок — до этого фамилию читали из first_name, считая поля
// перепутанными). Отчество раньше встречалось в middle_name, поэтому оставляем
// его запасным вариантом. Те же поля приходят плоскими у врача в записи, так что
// функции принимают profile или самого человека.
const trimmed = (value) => String(value ?? '').trim()

export function surnameOf(profile) {
	return trimmed(profile?.last_name)
}

// Имя с отчеством одной строкой: «Константин Сергеевич».
export function givenNameOf(profile) {
	return [trimmed(profile?.first_name), trimmed(profile?.second_name ?? profile?.middle_name)]
		.filter(Boolean)
		.join(' ')
}

// Полное ФИО: «Нелип Константин Сергеевич».
export function fullNameOf(profile) {
	return [surnameOf(profile), givenNameOf(profile)].filter(Boolean).join(' ')
}

// Плоский список времён на дату из ответа get-schedule.
export function scheduleTimes(schedule, date) {
	return Object.values(schedule?.[date] ?? {})
		.flat()
		.sort()
}
