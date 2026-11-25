import { test } from 'node:test'
import assert from 'node:assert/strict'
import { submitPatientBooking, validPatientPhone } from './patientBooking.js'

const patient = {
	firstName: 'Иван',
	lastName: 'Тестов',
	middleName: '',
	phone: '+7 (999) 123-45-67',
}
const payload = { company_id: 4, client_id: 12, date: '2026-11-26', start: '10:00' }
test('обычная запись не регистрирует другого пациента', async () => {
	let created
	await submitPatientBooking({
		otherPerson: false,
		payload,
		create: async (p) => (created = p),
		register: () => assert.fail(),
	})
	assert.equal(created, payload)
})
test('отдельный пациент: новая карточка, прежняя сессия, повтор регистрации не нужен', async () => {
	const draft = {}
	let registrations = 0
	const sent = []
	const options = {
		otherPerson: true,
		patient,
		payload,
		draft,
		newKey: () => 'a'.repeat(32),
		register: async (data) => {
			registrations++
			assert.equal(data.phone, '79991234567')
			assert.equal(data.id, undefined)
			return { client_id: 25, booking_token: 'proof' }
		},
		create: async (data) => {
			sent.push(data)
			return { id: 123 }
		},
	}
	await submitPatientBooking(options)
	await submitPatientBooking(options)
	assert.equal(registrations, 1)
	assert.equal(sent[0].client_id, 25)
	assert.equal(sent[0].booking_token, 'proof')
	assert.equal(payload.client_id, 12)
	await submitPatientBooking({ ...options, patient: { ...patient, firstName: 'Пётр' } })
	assert.equal(registrations, 2)
})
test('ошибка регистрации не запускает запись; ID владельца не принимается', async () => {
	for (const register of [
		async () => {
			throw Error('нет сети')
		},
		async () => ({ client_id: 12, booking_token: 'x' }),
	]) {
		await assert.rejects(
			submitPatientBooking({
				otherPerson: true,
				patient,
				payload,
				draft: {},
				newKey: () => 'x'.repeat(32),
				register,
				create: () => assert.fail(),
			}),
		)
	}
})
test('ошибка записи с HTTP200 не считается успехом', async () => {
	await assert.rejects(
		submitPatientBooking({
			otherPerson: true,
			patient,
			payload,
			draft: {},
			newKey: () => 'x'.repeat(32),
			register: async () => ({ client_id: 25, booking_token: 'x' }),
			create: async () => ({ date: ['Неверная дата'] }),
		}),
	)
})
test('телефон проверяется до запроса', async () => {
	assert.equal(validPatientPhone('8 (999) 123-45-67'), true)
	assert.equal(validPatientPhone('123'), false)
	await assert.rejects(
		submitPatientBooking({
			otherPerson: true,
			patient: { ...patient, phone: '123' },
			payload,
			register: () => assert.fail(),
		}),
	)
})
