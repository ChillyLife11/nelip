import { api } from '@/api/http'
import { COMPANY_ID } from '@/config'
import { LEAD_MS } from '@/composables/useBooking'

// Филиалы клиники. Требует авторизации (Bearer).
// Без filter[company_id] бэкенд отдаёт филиалы всех клиник разом.
// Элемент: { id, title, address, company_id, services[], coworkers[] } —
// услуги и сотрудники филиала приходят вложенными, отдельных запросов нет.
// Сотрудник: { id, username, status, services[], profile: { first_name,
// last_name, avatar, phone } }.
// Держим загруженное на один сеанс записи: по шагам ходят вперёд-назад, и
// повторный заход на экран не должен ждать сеть. Кеш живёт от старта флоу
// (startBooking/startRepeat зовут dropBranches()) до его конца — расписание и
// состав врачей за это время не успевают устареть, а между записями данные
// берутся заново.
let branches = null
let request = null

// Забыть загруженное: следующий экран сходит за свежими данными. Зовётся из
// useBooking на старте любого сценария записи.
export function dropBranches() {
	branches = null
	request = null
}

export function getBranches() {
	if (!request) {
		request = api
			.get('/branch/index', { params: { 'filter[company_id]': COMPANY_ID } })
			.then((r) => (branches = r.data ?? []))
			.catch((e) => {
				request = null
				throw e
			})
	}
	return request
}

// Уже загруженные филиалы (или null) — синхронно, для возврата на экран.
export function loadedBranches() {
	return branches
}

// Филиал по id: из кеша, а если списка ещё нет — с запросом.
export async function getBranch(id) {
	const list = branches ?? (await getBranches())
	return list.find((branch) => branch.id === id) ?? null
}

// Филиал из уже загруженного списка (или null) — синхронно.
export function loadedBranch(id) {
	return branches?.find((branch) => branch.id === id) ?? null
}

// Услуги филиала. Отдельного эндпоинта под них нет, и приходят они **из двух
// мест сразу**: в самом филиале (`branch.services`) и во врачах
// (`coworker.services`). У Нелип `branch.services` приходит пустым, а все 95
// услуг лежат во врачах — поэтому читаем оба источника, иначе каталог пуст.
export function branchServices(branch) {
	const list = [...(branch?.services ?? [])]
	for (const coworker of branch?.coworkers ?? []) list.push(...(coworker.services ?? []))
	return list
}

// Каталог услуг всей клиники: склейка по всем филиалам без дублей.
// Одна и та же услуга приходит с одним id (на этом же построена фильтрация
// врачей по услуге в ViewDoctors).
function uniqueServices(list) {
	const byId = new Map()
	for (const branch of list ?? []) {
		for (const service of branchServices(branch)) {
			if (!byId.has(service.id)) byId.set(service.id, service)
		}
	}
	return [...byId.values()]
}

export async function getAllServices() {
	return uniqueServices(await getBranches())
}

// Услуги из уже загруженных филиалов (или null) — синхронно.
export function loadedAllServices() {
	return branches ? uniqueServices(branches) : null
}

// Филиалы, где оказывают услугу. Для сценария «сначала услуга»: показываем
// только подходящие филиалы, а если он один — в списке останется он один.
function withService(list, serviceId) {
	return (list ?? []).filter((branch) =>
		branchServices(branch).some((service) => service.id === serviceId),
	)
}

export async function getBranchesWithService(serviceId) {
	return withService(await getBranches(), serviceId)
}

// Подходящие филиалы из уже загруженного списка (или null) — синхронно.
export function loadedBranchesWithService(serviceId) {
	return branches ? withService(branches, serviceId) : null
}

// Рабочий день клиники — с 10:00 до 18:00, а расписание бэкенд отдаёт шире (с
// утра и до 22:00), поэтому лишние слоты режем у себя. DAY_END — это закрытие, а
// не последний слот: старт в 18:00 не предлагаем, а приём, начатый раньше,
// должен уложиться до него. Длительность при этом проверяет fitSlots — ему нужны
// свободные слоты на весь приём, а за границей дня их просто нет, поэтому старты
// вроде 17:50 остаются только для коротких услуг.
// Ограничение общее для всего приложения — и для сетки времени, и для ближайших
// слотов в карточке врача, и для рабочих дней в календаре, потому что все три
// читают расписание через timeList() ниже.
const DAY_START = '10:00'
const DAY_END = '18:00'

function minutesOf(time) {
	const [hours, mins] = String(time).split(':').map(Number)
	return Number.isFinite(hours) ? hours * 60 + (mins || 0) : null
}

const DAY_START_MINUTES = minutesOf(DAY_START)
const DAY_END_MINUTES = minutesOf(DAY_END)

// Часы врача на дату. Бэкенд отдаёт их в двух видах: массивом ["09:00", …] и
// объектом { "1": "11:00", "3": "13:00" } — это PHP отдаёт разреженный массив
// (после занятых слотов индексы идут с пропусками) объектом, а не списком.
// Приводим оба вида к массиву времён и оставляем только рабочий день.
function timeList(slots) {
	const list = Array.isArray(slots)
		? slots
		: slots && typeof slots === 'object'
			? Object.values(slots)
			: []
	return list.filter((time) => {
		const minutes = minutesOf(time)
		return minutes !== null && minutes >= DAY_START_MINUTES && minutes < DAY_END_MINUTES
	})
}

// Врачи филиала на дату: { "<id врача>": часы }. День без приёма приходит
// пустым массивом вместо объекта — по той же причине, что и часы выше.
function bySchedule(branch, date) {
	const byMaster = branch?.schedule?.[date]
	return byMaster && !Array.isArray(byMaster) ? byMaster : {}
}

// Расписание филиала: { "YYYY-MM-DD": { "<id врача>": ["09:00", …] } }.
// Бэкенд отдаёт только ближайшие дни (около недели) и только рабочие — значит
// дни, которых в расписании нет, для записи закрыты.
// Врача учитываем: в один и тот же день в филиале принимают не все.
export function scheduleDates(branch, masterId = null) {
	const schedule = branch?.schedule ?? {}
	const open = Object.keys(schedule).filter((date) => {
		const byMaster = bySchedule(branch, date)
		return masterId === null
			? Object.values(byMaster).some((slots) => timeList(slots).length)
			: timeList(byMaster[masterId]).length > 0
	})
	return new Set(open)
}

// Адрес приходит с городом впереди — «город Улан-Удэ, Павлова, 59А» или просто
// «Улан-Удэ, Павлова, 5». В макете только улица и дом: «ул. Павлова, 5».
export function shortAddress(branch) {
	let parts = (branch?.address ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part && !/^(город|г\.?)\s/i.test(part))
	// Город без приставки «город» отсечь по маске нельзя — убираем первую часть,
	// если после неё ещё остаются улица и дом.
	if (parts.length >= 3) parts = parts.slice(1)
	if (!parts.length) return branch?.title ?? ''
	const [street, ...rest] = parts
	const named = /^(ул|улица|просп|пр-т|мкр|бул)/i.test(street) ? street : `ул. ${street}`
	return [named, ...rest].join(', ')
}

// Длительность услуги в минутах. Бэкенд завёл её недавно, и имя поля пока не
// подтверждено — принимаем несколько вариантов и оба формата: число минут
// (20, "30") и «HH:MM:SS» («00:20:00»). Если длительности нет, считаем приём
// получасовым, как было до её появления.
export const DEFAULT_MINUTES = 30

export function serviceMinutes(service) {
	const raw =
		service?.duration ??
		service?.duration_minutes ??
		service?.minutes ??
		service?.length ??
		service?.time
	if (raw === null || raw === undefined || raw === '') return DEFAULT_MINUTES
	if (typeof raw === 'string' && raw.includes(':')) {
		const [hours, mins] = raw.split(':').map(Number)
		const total = (hours || 0) * 60 + (mins || 0)
		return total > 0 ? total : DEFAULT_MINUTES
	}
	const total = Number(raw)
	return Number.isFinite(total) && total > 0 ? total : DEFAULT_MINUTES
}

const minutesOfTime = (time) => {
	const [hours, mins] = String(time).split(':').map(Number)
	return Number.isFinite(hours) ? hours * 60 + (mins || 0) : null
}

// Шаг сетки берём из самих данных: бэкенд отдаёт слоты по 10 минут, но раньше
// были часовые, и жёсткое число сломалось бы при следующей смене.
function stepOf(minutes) {
	let step = Infinity
	for (let i = 1; i < minutes.length; i += 1) {
		const diff = minutes[i] - minutes[i - 1]
		if (diff > 0 && diff < step) step = diff
	}
	return Number.isFinite(step) ? step : 10
}

// Старты, на которые приём нужной длительности влезает целиком и не наезжает на
// соседний. Слоты приходят по 10 минут, а приём занимает 20-40 — значит часть
// стартов показывать нельзя: при длительности 20 минут из
// [10:00, 10:10, 10:20, 10:30, 10:40] остаются только 10:00 и 10:20
// (10:40 отпадает — под него нужен ещё свободный 10:50).
export function fitSlots(times, minutes = DEFAULT_MINUTES) {
	const list = [...new Set(times.map(minutesOfTime).filter((m) => m !== null))].sort(
		(a, b) => a - b,
	)
	if (!list.length) return []
	const step = stepOf(list)
	const free = new Set(list)
	const need = Math.max(1, Math.ceil(minutes / step))

	const fits = (start) => {
		for (let i = 0; i < need; i += 1) if (!free.has(start + i * step)) return false
		return true
	}

	const pad = (n) => String(n).padStart(2, '0')
	const out = []
	let busyUntil = -Infinity
	for (const start of list) {
		if (start < busyUntil || !fits(start)) continue
		out.push(`${pad(Math.floor(start / 60))}:${pad(start % 60)}`)
		busyUntil = start + need * step
	}
	return out
}

// Часы врача на конкретный день — сетка времени на последнем шаге записи.
// masterId === null: объединяем часы всех врачей филиала (тот же режим, что и
// у scheduleDates), иначе берём только выбранного.
export function scheduleSlots(branch, masterId, date, minutes = DEFAULT_MINUTES) {
	const byMaster = bySchedule(branch, date)
	if (masterId !== null && masterId !== undefined)
		return fitSlots(timeList(byMaster[masterId]), minutes)
	const all = new Set()
	for (const slots of Object.values(byMaster)) for (const time of timeList(slots)) all.add(time)
	return fitSlots([...all], minutes)
}

// Ближайшие свободные часы врача — для карточки на экране выбора врача.
// Идём по датам расписания с начала и берём первый день, где ещё осталось
// время: прошедшие часы и ближайший час от «сейчас» не в счёт, как и на
// экране выбора времени.
export function nearestSlots(branch, masterId, count = 3, minutes = DEFAULT_MINUTES) {
	const schedule = branch?.schedule ?? {}
	const now = Date.now()
	for (const date of Object.keys(schedule).sort()) {
		const times = fitSlots(timeList(bySchedule(branch, date)[masterId]), minutes).filter(
			(time) => new Date(`${date}T${time}`).getTime() - now >= LEAD_MS,
		)
		if (times.length) return { date, times: times.slice(0, count) }
	}
	return null
}
