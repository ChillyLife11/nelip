// Отдельная регистрация не меняет сессию MAX и не использует вход другого пациента.
export function normalizedPatientPhone(value) {
	let phone = String(value ?? '').replace(/\D/g, '')
	if (phone.length === 10) phone = `7${phone}`
	if (phone.length === 11 && phone.startsWith('8')) phone = `7${phone.slice(1)}`
	return phone
}

export function validPatientPhone(value) {
	return /^[1-9][0-9]{9,14}$/.test(normalizedPatientPhone(value))
}

export async function submitPatientBooking({
	otherPerson,
	patient,
	payload,
	draft,
	register,
	create,
	newKey,
}) {
	if (!otherPerson) return create(payload)
	const fields = {
		first_name: patient.firstName.trim(),
		last_name: patient.lastName.trim(),
		second_name: patient.middleName.trim(),
		phone: normalizedPatientPhone(patient.phone),
	}
	if (!fields.first_name || !fields.last_name || !validPatientPhone(fields.phone)) {
		throw new Error('Укажите фамилию, имя и телефон пациента.')
	}
	const fingerprint = JSON.stringify(fields)
	if (draft.fingerprint !== fingerprint) {
		draft.fingerprint = fingerprint
		draft.key = newKey()
		draft.registration = null
	}
	if (!draft.registration) {
		const result = await register({
			...fields,
			company_id: payload.company_id,
			request_key: draft.key,
		})
		if (
			!Number.isSafeInteger(result?.client_id) ||
			result.client_id <= 0 ||
			result.client_id === Number(payload.client_id) ||
			typeof result.booking_token !== 'string' ||
			!result.booking_token
		) {
			throw new Error('Не удалось зарегистрировать отдельного пациента.')
		}
		draft.registration = result
	}
	const result = await create({
		...payload,
		...fields,
		client_id: draft.registration.client_id,
		booking_token: draft.registration.booking_token,
	})
	if (
		!Number.isSafeInteger(Number(result?.id)) ||
		Number(result.id) <= 0 ||
		result.ok === false
	) {
		throw new Error(
			result?.message ||
				'Не удалось подтвердить создание записи. Проверьте её статус в клинике.',
		)
	}
	return result
}
