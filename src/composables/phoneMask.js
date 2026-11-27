// Маска российского номера: +7 (XXX) XXX-XX-XX. В поле лежит уже отформатированная
// строка, бэкенду её приводит к 79991234567 normalizedPatientPhone().

const PREFIX = '+7 ('

// Десять цифр номера без кода страны → строка маски. Пустой номер — пустое поле,
// чтобы был виден placeholder.
export function formatPhone(digits) {
	const d = digits.slice(0, 10)
	if (!d) return ''
	let out = PREFIX + d.slice(0, 3)
	if (d.length > 3) out += ') ' + d.slice(3, 6)
	if (d.length > 6) out += '-' + d.slice(6, 8)
	if (d.length > 8) out += '-' + d.slice(8, 10)
	return out
}

// Цифры номера из того, что лежит в поле, и сколько их стоит до курсора.
// Первая 7 или 8 — код страны (из маски, вставленного «+7 …» или «8 …»), в номер
// она не идёт.
function parse(raw, caret) {
	let digits = ''
	let before = 0
	let prefix = null
	for (let i = 0; i < raw.length; i++) {
		const ch = raw[i]
		if (ch < '0' || ch > '9') continue
		if (prefix === null) {
			prefix = ch === '7' || ch === '8'
			if (prefix) continue
		}
		digits += ch
		if (i < caret) before++
	}
	return { digits, before }
}

// Позиция курсора в отформатированной строке после n-й цифры номера.
function caretAfter(formatted, n) {
	if (!formatted) return 0
	let pos = PREFIX.length
	for (let seen = 0; pos < formatted.length && seen < n; pos++) {
		if (formatted[pos] >= '0' && formatted[pos] <= '9') seen++
	}
	return pos
}

// Обработчик @input: переписывает поле по маске, сохраняя место курсора, и
// отдаёт новое значение. Удаление разделителя («-», «)») стирает соседнюю цифру
// — иначе маска вернула бы разделитель на место и Backspace бы «залип».
export function maskPhoneInput(event, previous) {
	const el = event.target
	let { digits, before } = parse(el.value, el.selectionStart ?? el.value.length)
	const old = parse(previous ?? '', 0).digits
	const deleting = event.inputType?.startsWith('delete')
	if (deleting && digits === old) {
		const at = event.inputType === 'deleteContentForward' ? before : before - 1
		if (at >= 0 && at < digits.length) {
			digits = digits.slice(0, at) + digits.slice(at + 1)
			before = at
		}
	}
	digits = digits.slice(0, 10)
	const value = formatPhone(digits)
	el.value = value
	const pos = caretAfter(value, Math.min(before, digits.length))
	el.setSelectionRange?.(pos, pos)
	return value
}
