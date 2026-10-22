import { api } from '@/api/http'
import { COMPANY_ID } from '@/config'
import { fullNameOf } from '@/api/coworkers'
import { LEAD_MS } from '@/composables/useBooking'

// Филиалы клиники. Требует авторизации (Bearer).
// Без filter[company_id] бэкенд отдаёт филиалы всех клиник разом.
// Элемент: { id, title, address, company_id, services[], coworkers[] } —
// услуги и сотрудники филиала приходят вложенными, отдельных запросов нет.
// Сотрудник: { id, username, status, services[], profile: { last_name (фамилия),
// first_name (имя), second_name (отчество), avatar, phone } }.
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

// Рабочий день клиники — с 10:00 до 17:00, а расписание бэкенд отдаёт шире (с
// утра и до 22:00), поэтому лишние слоты режем у себя. DAY_END — это закрытие, а
// не последний слот: старт в 17:00 не предлагаем, а приём, начатый раньше,
// должен уложиться до него. Длительность при этом проверяет slotGrid — ему нужны
// свободные слоты на весь приём, а за границей дня их просто нет, поэтому старты
// у края дня остаются только для коротких услуг.
// Ограничение общее для всего приложения — и для сетки времени, и для ближайших
// слотов в карточке врача, и для рабочих дней в календаре, потому что все три
// читают расписание через timeList() ниже.
const DAY_START = '10:00'
const DAY_END = '17:00'
// Исключение: маммография идёт до 18:00 — аппарат работает дольше, чем ведут
// приём врачи (просьба клиники 19.10.2026; маммографию ведёт Митрофанов
// Дмитрий, но завязываемся на услугу, а не на врача: врач может смениться).
const LATE_DAY_END = '18:00'
const LATE_SERVICE = /маммограф/i

function minutesOf(time) {
	const [hours, mins] = String(time).split(':').map(Number)
	return Number.isFinite(hours) ? hours * 60 + (mins || 0) : null
}

const DAY_START_MINUTES = minutesOf(DAY_START)
const DAY_END_MINUTES = minutesOf(DAY_END)
const LATE_DAY_END_MINUTES = minutesOf(LATE_DAY_END)

// До какого часа записывают на эту услугу. Услуги нет (кеш ещё не доехал) —
// считаем по общему правилу, чтобы случайно не открыть лишний час.
export function serviceDayEnd(service) {
	return LATE_SERVICE.test(service?.title ?? '') ? LATE_DAY_END_MINUTES : DAY_END_MINUTES
}

// Часы врача на дату. Бэкенд отдаёт их в двух видах: массивом ["09:00", …] и
// объектом { "1": "11:00", "3": "13:00" } — это PHP отдаёт разреженный массив
// (после занятых слотов индексы идут с пропусками) объектом, а не списком.
// Приводим оба вида к массиву времён и оставляем только рабочий день.
function rawList(slots) {
	return Array.isArray(slots)
		? slots
		: slots && typeof slots === 'object'
			? Object.values(slots)
			: []
}

function timeList(slots, window = { start: DAY_START_MINUTES, end: DAY_END_MINUTES }) {
	return rawList(slots).filter((time) => {
		const minutes = minutesOf(time)
		return minutes !== null && minutes >= window.start && minutes < window.end
	})
}

// Персональные часы врача: у части врачей день уже общего. Ключ — имя, а не id:
// id в базе клиники уже менялся при переносе карточек, а имя клиника называет
// сама. Если врача в списке нет, действуют общие часы.
const DOCTOR_HOURS = [{ match: /нелип\s+владимир/i, start: '10:30', end: '17:00' }]

function masterRule(branch, masterId) {
	if (masterId === null || masterId === undefined) return null
	const master = (branch?.coworkers ?? []).find((c) => c.id === masterId)
	if (!master) return null
	const name = fullNameOf(master.profile ?? master)
	return DOCTOR_HOURS.find((rule) => rule.match.test(name)) ?? null
}

// Окно приёма на день: общий рабочий день, суженный услугой (маммография идёт
// до 18:00) и персональными часами врача. Берём самое узкое из правил.
function dayWindow(branch, masterId, service) {
	const rule = masterRule(branch, masterId)
	return {
		start: Math.max(DAY_START_MINUTES, rule ? minutesOf(rule.start) : 0),
		end: Math.min(serviceDayEnd(service), rule ? minutesOf(rule.end) : Infinity),
	}
}

// Воскресенье и понедельник в клинике не принимают. Бэкенд эти дни в расписании
// всё равно присылает, поэтому закрываем их у себя — ровно там же, где живут
// границы рабочего дня, чтобы правила приёма лежали в одном месте. Проверка
// стоит в трёх точках, через которые читается расписание: в днях календаря
// (scheduleDates), в сетке времени (scheduleSlots) и в ближайших слотах
// (nearestSlots).
const WEEKEND_WEEKDAYS = new Set([0, 1])

// Дату разбираем вручную: new Date('2026-10-18') — это UTC-полночь, и в часовом
// поясе клиники (+8) getDay() отдал бы предыдущий день.
function isWorkday(date) {
	const [year, month, day] = String(date).split('-').map(Number)
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return true
	return !WEEKEND_WEEKDAYS.has(new Date(year, month - 1, day).getDay())
}

// Врачи филиала на дату: { "<id врача>": часы }. День без приёма приходит
// пустым массивом вместо объекта — по той же причине, что и часы выше.
function bySchedule(branch, date) {
	const byMaster = branch?.schedule?.[date]
	return byMaster && !Array.isArray(byMaster) ? byMaster : {}
}

// Расписание филиала: { "YYYY-MM-DD": { "<id врача>": ["09:00", …] } }.
// Бэкенд отдаёт только ближайшие дни (около недели) — значит дни, которых в
// расписании нет, для записи закрыты. Выходные клиники он при этом присылает,
// их отсекает isWorkday().
// Врача учитываем: в один и тот же день в филиале принимают не все.
export function scheduleDates(branch, masterId = null, service = null) {
	const schedule = branch?.schedule ?? {}
	const window = dayWindow(branch, masterId, service)
	const open = Object.keys(schedule).filter((date) => {
		if (!isWorkday(date)) return false
		const byMaster = bySchedule(branch, date)
		return masterId === null
			? Object.values(byMaster).some((slots) => timeList(slots, window).length)
			: timeList(byMaster[masterId], window).length > 0
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
// были часовые, и жёсткое число сломалось бы при следующей смене. Считаем по
// всем врачам дня: у одного врача свободного времени может остаться слишком
// мало, чтобы зазор был виден.
function dayStep(byMaster) {
	const all = new Set()
	for (const slots of Object.values(byMaster)) {
		for (const time of rawList(slots)) {
			const minutes = minutesOfTime(time)
			if (minutes !== null) all.add(minutes)
		}
	}
	return stepOf([...all].sort((a, b) => a - b))
}

function stepOf(minutes) {
	let step = Infinity
	for (let i = 1; i < minutes.length; i += 1) {
		const diff = minutes[i] - minutes[i - 1]
		if (diff > 0 && diff < step) step = diff
	}
	return Number.isFinite(step) ? step : 10
}

// Сетка стартов на день: каждый старт помечен, свободен он или занят. Занятые
// показываем серыми — пустой экран читается как поломка, а серая сетка сразу
// говорит, что врач в этот день занят (просьба клиники 22.10.2026).
//
// Расписание с бэкенда — это **свободное** время по десять минут. Значит старт
// свободен, когда свободны все слоты, которые займёт приём: при длительности 20
// минут старту 10:00 нужны и 10:00, и 10:10.
//
// Сетку строим от начала рабочего окна с шагом в длительность, а не от первого
// свободного слота: иначе при каждой новой записи соседние старты съезжали бы, и
// человек видел бы разное время на одном и том же дне.
export function slotGrid(branch, masterId, date, service = null) {
	if (!isWorkday(date)) return []
	const window = dayWindow(branch, masterId, service)
	const minutes = serviceMinutes(service)
	const byMaster = bySchedule(branch, date)
	const step = dayStep(byMaster)
	const need = Math.max(1, Math.ceil(minutes / step))

	const slots =
		masterId === null || masterId === undefined
			? Object.values(byMaster).flatMap(rawList)
			: rawList(byMaster[masterId])
	const free = new Set(slots.map(minutesOfTime).filter((m) => m !== null))

	const pad = (n) => String(n).padStart(2, '0')
	const out = []
	for (let begin = window.start; begin + minutes <= window.end; begin += need * step) {
		let open = true
		for (let i = 0; i < need && open; i += 1) open = free.has(begin + i * step)
		out.push({ time: `${pad(Math.floor(begin / 60))}:${pad(begin % 60)}`, free: open })
	}
	return out
}

// Часы врача на конкретный день — только свободные. Сетку строит slotGrid,
// здесь остаётся фильтр: так экран времени и карточка врача считают одинаково.
// masterId === null: объединяем часы всех врачей филиала (тот же режим, что и
// у scheduleDates), иначе берём только выбранного.
export function scheduleSlots(branch, masterId, date, service = null) {
	return slotGrid(branch, masterId, date, service)
		.filter((slot) => slot.free)
		.map((slot) => slot.time)
}

// Ближайшие свободные часы врача — для карточки на экране выбора врача.
// Идём по датам расписания с начала и берём первый день, где ещё осталось
// время: прошедшие часы не в счёт, как и на экране выбора времени (LEAD_MS).
export function nearestSlots(branch, masterId, count = 3, service = null) {
	const schedule = branch?.schedule ?? {}
	const now = Date.now()
	for (const date of Object.keys(schedule).sort()) {
		const times = scheduleSlots(branch, masterId, date, service).filter(
			(time) => new Date(`${date}T${time}`).getTime() - now >= LEAD_MS,
		)
		if (times.length) return { date, times: times.slice(0, count) }
	}
	return null
}
