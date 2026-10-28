// Состояние флоу записи: услуга → врач → дата/время. Филиал как шаг убран —
// клиника одна, и он подставляется сам на шаге услуги.
// Экраны разнесены по роутам, поэтому выбор держим в одном модульном состоянии,
// а не в каждой вьюхе отдельно.
//
// Имена совпадают с ключами API:
//   client_id — id клиента (после входа, лежит в @/session)
//   master_id — id врача (из /coworker/index)
//   branch_id — id филиала (из /branch/index)

import { ref } from 'vue'
import { COMPANY_ID } from '@/config'
import { clientId } from '@/session'
import { branchServices, dropBranches, loadedBranch, serviceMinutes } from '@/api/branches'

const branchId = ref(null)
const serviceId = ref(null)
const masterId = ref(null)
const date = ref(null)
const time = ref(null)

// ФИО пациента для записи — заполняется в окне подтверждения (обязательны
// фамилия и имя). Живёт отдельно от выбора шагов и reset() его не трогает: это
// данные о человеке, а не о конкретной записи, и при следующей записи их не
// нужно вводить заново.
const patient = ref({ lastName: '', firstName: '', middleName: '' })

const clean = (value) => String(value ?? '').trim()

function patientReady() {
	return Boolean(clean(patient.value.lastName) && clean(patient.value.firstName))
}

// Подставить ФИО, если пациент его ещё не вводил. Источник выбирает вызывающий
// (см. clientNameParts в @/composables/useAuth).
function fillPatient(parts = {}) {
	const current = patient.value
	if (clean(current.lastName) || clean(current.firstName) || clean(current.middleName)) return
	patient.value = {
		lastName: clean(parts.lastName),
		firstName: clean(parts.firstName),
		middleName: clean(parts.middleName),
	}
}

function reset() {
	branchId.value = null
	serviceId.value = null
	masterId.value = null
	date.value = null
	time.value = null
}

// Старт новой записи с точки входа: сбрасываем прошлый выбор, иначе экраны
// подставят услугу и врача от предыдущей.
// Заодно забываем загруженные филиалы: справочник тянет за собой услуги, врачей
// и расписание, а они за время сеанса могли измениться — каждая новая запись
// начинается со свежих данных.
function startBooking() {
	reset()
	dropBranches()
}

// Повтор записи из истории: подставляем прошлый выбор целиком, чтобы человеку
// осталось выбрать только дату и время. Дату и время не переносим — они в прошлом.
function startRepeat({ branch = null, service = null, master = null } = {}) {
	reset()
	dropBranches()
	branchId.value = branch
	serviceId.value = service
	masterId.value = master
}

// Запас перед ближайшей записью. С 20.10.2026 его нет (просьба клиники): если
// слот ещё не прошёл, на него можно записаться — хоть на ближайшие десять минут.
// Ноль не отключает проверку совсем, а сводит её к «время не должно быть
// прошедшим»: сетка и карточка врача сравнивают слот с «сейчас» через эту
// константу. Вернуть запас — поставить сюда часы в миллисекундах.
export const LEAD_MS = 0

// Длительность приёма берём из услуги: бэкенд ждёт конец интервала (end), а
// услуги теперь приходят со своей длительностью (20-40 минут). Если её нет,
// serviceMinutes вернёт прежние 30 минут.
function appointmentMinutes() {
	const branch = loadedBranch(branchId.value)
	return serviceMinutes(branchServices(branch).find((s) => s.id === serviceId.value))
}

function addMinutes(startTime, minutes) {
	const [hours, mins] = startTime.split(':').map(Number)
	const total = hours * 60 + mins + minutes
	const pad = (n) => String(n).padStart(2, '0')
	return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`
}

// Тело запроса POST /appointment/create.
function appointmentPayload() {
	return {
		company_id: COMPANY_ID,
		client_id: clientId.value,
		branch_id: branchId.value,
		master_id: masterId.value,
		date: date.value,
		start: time.value,
		end: addMinutes(time.value, appointmentMinutes()),
		status: 0,
		services: serviceId.value ? [serviceId.value] : [],
		source: 'max',
		// ⚠️ Порядок полей — как в описании метода от бэкенда (28.10.2026):
		// first_name — ФАМИЛИЯ, last_name — ИМЯ. У врачей в /branch/index те же
		// поля названы наоборот (first_name — имя), так что это не опечатка
		// здесь, а договорённость для appointment/create. Если в карточке клиента
		// фамилия и имя окажутся переставлены — менять эти две строки.
		first_name: clean(patient.value.lastName),
		last_name: clean(patient.value.firstName),
		second_name: clean(patient.value.middleName),
	}
}

// Все ли шаги пройдены (и известен клиент) — без этого запись отправлять нечего.
function isComplete() {
	return Boolean(
		clientId.value &&
		branchId.value &&
		serviceId.value &&
		masterId.value &&
		date.value &&
		time.value &&
		patientReady(),
	)
}

export function useBooking() {
	return {
		branchId,
		serviceId,
		masterId,
		date,
		time,
		startBooking,
		startRepeat,
		reset,
		appointmentPayload,
		isComplete,
		patient,
		patientReady,
		fillPatient,
	}
}
