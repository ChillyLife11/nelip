// Тестовые данные на время, пока бэкенд не наполнен.
//
// Живой ответ `/branch/index?filter[company_id]=4` отдаёт один филиал и восемь
// сотрудников, но **услуг там ноль, а расписание — пустые массивы**: пройти
// шаги записи (услуга → врач → дата/время) на реальных данных нельзя. Поэтому
// справочник подменяем целиком, но **на реальных id**: филиал `4` и врачи
// `3933…3939` — те же, что отдаёт сервер, с теми же именами (фамилия приходит в
// `first_name`, имя в `last_name` — перепутано на бэкенде, здесь квирк сохранён).
// Выдуманы только услуги, расписание и второй филиал.
//
// Включается флагом `MOCK_DATA` (@/config): в этом режиме `api/branches` и
// `api/appointments` вообще не ходят в сеть — ни запись не создаётся на сервере,
// ни записи клиента не читаются оттуда. Созданные записи живут в памяти
// страницы, чтобы после записи их было видно в слайдере на главной, а после
// отмены — в истории.
//
// ⚠️ Перед релизом флаг выключить (`VITE_MOCK_DATA=false` или дефолт в конфиге).

// Услуги. Своего эндпоинта у них нет — приходят вложенными в филиал, каталог
// клиники собирается склейкой (см. getAllServices). Направления взяты по составу
// оборудования клиники (src/content/clinic.js).
const SERVICES = [
	{ id: 901, title: 'УЗИ' },
	{ id: 902, title: 'Маммография' },
	{ id: 903, title: 'Дерматология' },
	{ id: 904, title: 'Онкология' },
	{ id: 905, title: 'Биопсия EnCor Ultra' },
	{ id: 906, title: 'Консультация терапевта' },
	{ id: 907, title: 'Эндокринология' },
]

const service = (id) => SERVICES.find((item) => item.id === id)

// Врачи — id, username и ФИО из живого ответа. `shift` задаёт, в какие дни врач
// принимает: нужны и закрытые дни, иначе в календаре нечего проверять.
// Админа (2991) в списке нет — он и в живых данных без услуг.
const DOCTORS = [
	{
		id: 3933,
		username: 'nelip-vladimir-3',
		surname: 'Нелип',
		name: 'Владимир',
		position: 'Онколог',
		services: [904, 905],
		hours: 'morning',
		shift: 'all',
	},
	{
		id: 3934,
		username: 'nelip-konstantin-4',
		surname: 'Нелип',
		name: 'Константин',
		position: 'Хирург-онколог',
		services: [904, 905, 901],
		hours: 'evening',
		shift: 'odd',
	},
	{
		id: 3935,
		username: 'polesuk-marina-6',
		surname: 'Полешук',
		name: 'Марина',
		position: 'Врач УЗИ',
		services: [901, 902],
		hours: 'morning',
		shift: 'all',
	},
	{
		id: 3936,
		username: 'zabavina-anna-9',
		surname: 'Забавина',
		name: 'Анна',
		position: 'Дерматолог',
		services: [903],
		hours: 'evening',
		shift: 'even',
	},
	{
		id: 3937,
		username: 'bukalova-tatana-10',
		surname: 'Букалова',
		name: 'Татьяна',
		position: 'Терапевт',
		services: [906, 907],
		hours: 'morning',
		shift: 'odd',
	},
	{
		id: 3938,
		username: 'mitrofanov-dmitrij-11',
		surname: 'Митрофанов',
		name: 'Дмитрий',
		position: 'Маммолог',
		services: [902, 901],
		hours: 'evening',
		shift: 'all',
	},
	{
		id: 3939,
		username: 'ivancuk-vladislav-12',
		surname: 'Иванчук',
		name: 'Владислав',
		position: 'Эндокринолог',
		services: [907, 906],
		hours: 'morning',
		shift: 'even',
	},
]

const doctor = (id) => DOCTORS.find((item) => item.id === id)

// Филиалы: первый — настоящий (id и адрес из живого ответа), второй выдуман,
// чтобы на экране выбора филиала была сетка из двух карточек, как в макете.
const BRANCHES = [
	{
		id: 4,
		title: 'Клиника доктора Нелип',
		address: 'Улан-Удэ, Павлова, 5',
		doctors: [3933, 3934, 3935, 3936, 3937, 3938, 3939],
	},
	{
		id: 94,
		title: 'Клиника доктора Нелип на Ленина',
		address: 'Улан-Удэ, Ленина, 55',
		doctors: [3935, 3936, 3937],
	},
]

// Часы приёма: у каждого врача свой режим, чтобы сетка времени отличалась от
// врача к врачу — в живых данных так и есть (у одного день с 09:00, у другого
// только 15:30 и 16:30).
const HOURS = {
	morning: ['09:00', '10:00', '11:00', '12:00', '13:00'],
	evening: ['14:00', '15:00', '15:30', '16:30', '17:00'],
}

const SCHEDULE_DAYS = 14

const pad = (n) => String(n).padStart(2, '0')

// Расписание считаем от сегодняшнего дня, а не фиксированными датами: иначе
// тестовые данные «протухнут» через неделю и календарь окажется пустым.
function dayAt(offset) {
	const date = new Date()
	date.setHours(12, 0, 0, 0)
	date.setDate(date.getDate() + offset)
	return date
}

const isoOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

function worksOn(info, weekday) {
	if (info.shift === 'odd') return weekday % 2 === 1
	if (info.shift === 'even') return weekday % 2 === 0
	return true
}

// Бэкенд отдаёт часы то массивом, то объектом с разреженными индексами
// ({ "1": "11:00", "3": "13:00" } — так PHP сериализует массив с пропусками).
// Раз в несколько дней подкладываем вторую форму: нормализация в
// @/api/branches должна проверяться и на тестовых данных.
function slotShape(times, offset) {
	if (offset % 4 !== 3) return times
	return Object.fromEntries(times.map((time, index) => [String(index * 2 + 1), time]))
}

function scheduleOf(branch) {
	const schedule = {}
	for (let offset = 0; offset < SCHEDULE_DAYS; offset += 1) {
		const date = dayAt(offset)
		const weekday = date.getDay()
		// Воскресенье в расписании просто не появляется — выходных бэкенд не
		// присылает вовсе.
		if (weekday === 0) continue

		const iso = isoOf(date)
		// День без приёма приходит пустым массивом вместо объекта врачей — ещё
		// одна форма из живого ответа.
		if (offset % 7 === 5) {
			schedule[iso] = []
			continue
		}

		const byMaster = {}
		for (const id of branch.doctors) {
			const info = doctor(id)
			if (!worksOn(info, weekday)) continue
			byMaster[String(id)] = slotShape(HOURS[info.hours], offset)
		}
		if (Object.keys(byMaster).length) schedule[iso] = byMaster
	}
	return schedule
}

// Сотрудник филиала в том же виде, в каком его отдаёт `/branch/index`: ФИО во
// вложенном profile, услуги списком объектов.
function coworkerOf(id, services) {
	const info = doctor(id)
	return {
		id: info.id,
		username: info.username,
		status: 1,
		position: info.position,
		services: info.services.filter((s) => services.includes(s)).map(service),
		profile: {
			first_name: info.surname,
			last_name: info.name,
			avatar: null,
			phone: null,
		},
	}
}

function branchOf(branch) {
	// Услуги филиала — те, которые оказывает хоть кто-то из его врачей.
	const services = SERVICES.filter((item) =>
		branch.doctors.some((id) => doctor(id).services.includes(item.id)),
	)
	return {
		id: branch.id,
		title: branch.title,
		address: branch.address,
		company_id: 4,
		services,
		coworkers: branch.doctors.map((id) =>
			coworkerOf(
				id,
				services.map((item) => item.id),
			),
		),
		schedule: scheduleOf(branch),
	}
}

let announced = false

function announce() {
	if (announced) return
	announced = true
	console.warn('[mock] справочники и записи тестовые — см. MOCK_DATA в @/config')
}

export function mockBranches() {
	announce()
	return BRANCHES.map(branchOf)
}

// Записи клиента. Две прошлые — чтобы экран истории не был пустым (выполненная
// и отменённая, у них разные иконки), актуальных нет: «Записаться» на главной
// прячется, только когда актуальная появится, и это видно после записи.
function seedAppointments() {
	const past = (offset, start, status, serviceId, masterId) => ({
		id: 90000 + offset,
		date: isoOf(dayAt(-offset)),
		start,
		end: start.replace(/:\d\d$/, ':30'),
		status,
		source: 'max',
		company_id: 4,
		branch_id: 4,
		master_id: masterId,
		services: [service(serviceId)],
		branch: { id: 4, title: BRANCHES[0].title, address: BRANCHES[0].address },
		master: {
			id: masterId,
			username: doctor(masterId).username,
			profile: {
				first_name: doctor(masterId).surname,
				last_name: doctor(masterId).name,
				avatar: null,
			},
		},
	})
	return [past(21, '11:00', 5, 901, 3935), past(7, '16:00', 6, 903, 3936)]
}

let appointments = null
let nextId = 90100

function allAppointments() {
	if (!appointments) appointments = seedAppointments()
	return appointments
}

// Небольшая задержка: без неё лоадеры и состояние кнопки «Подтвердить запись»
// на тестовых данных не увидеть вовсе.
const delay = (value, ms = 300) => new Promise((resolve) => setTimeout(() => resolve(value), ms))

export function mockGetAppointments(statuses = null) {
	announce()
	const list = allAppointments()
		.filter((item) => !statuses || statuses.includes(Number(item.status)))
		.sort((a, b) => (a.date < b.date ? 1 : -1))
	return delay(list)
}

// Созданная запись остаётся в памяти страницы: после перехода на главную она
// должна появиться в слайдере, а «Записаться» — спрятаться.
export function mockCreateAppointment(payload) {
	announce()
	const branch = BRANCHES.find((item) => item.id === payload.branch_id) ?? BRANCHES[0]
	const master = doctor(payload.master_id)
	const created = {
		...payload,
		id: (nextId += 1),
		status: payload.status ?? 0,
		services: (payload.services ?? []).map(service).filter(Boolean),
		branch: { id: branch.id, title: branch.title, address: branch.address },
		master: master
			? {
					id: master.id,
					username: master.username,
					profile: {
						first_name: master.surname,
						last_name: master.name,
						avatar: null,
					},
				}
			: null,
	}
	allAppointments().unshift(created)
	return delay(created)
}

export function mockCancelAppointment(id) {
	announce()
	const found = allAppointments().find((item) => item.id === id)
	if (found) found.status = 6
	return delay(found ?? null)
}
