/**
 * @file validators.ts
 * @description Funciones de validación para documentos de identidad españoles (DNI y NIE).
 *
 * Implementa el algoritmo oficial de verificación de la letra de control
 * del DNI/NIE según la normativa española.
 *
 * @see https://www.interior.gob.es/opencms/ca/servicios-al-ciudadano/tramites-y-gestiones/dni/
 * @module lib/validators
 */

/**
 * Secuencia oficial de letras de control para DNI/NIE.
 * El índice se obtiene calculando `número % 23`.
 */
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE' as const;

/**
 * Patrón regex para un DNI español válido.
 * Formato: 8 dígitos seguidos de 1 letra (A-Z).
 */
const DNI_REGEX = /^(\d{8})([A-Z])$/;

/**
 * Patrón regex para un NIE español válido.
 * Formato: X, Y o Z seguido de 7 dígitos y 1 letra (A-Z).
 */
const NIE_REGEX = /^([XYZ])(\d{7})([A-Z])$/;

/**
 * Mapeo del prefijo del NIE a su equivalente numérico.
 * - X → 0
 * - Y → 1
 * - Z → 2
 */
const NIE_PREFIX_MAP: Readonly<Record<string, string>> = {
  X: '0',
  Y: '1',
  Z: '2',
} as const;

/**
 * Valida un DNI español (Documento Nacional de Identidad).
 *
 * El algoritmo toma los 8 dígitos, calcula el módulo 23 del número resultante,
 * y compara la letra obtenida con la secuencia oficial `TRWAGMYFPDXBNJZSQVHLCKE`.
 *
 * @param dni - Cadena con el DNI a validar (8 dígitos + 1 letra).
 * @returns `true` si el DNI es válido, `false` en caso contrario.
 *
 * @example
 * ```ts
 * validateDNI('12345678Z'); // true
 * validateDNI('12345678z'); // true (case insensitive)
 * validateDNI('12345678A'); // false (letra incorrecta)
 * validateDNI('1234567Z');  // false (solo 7 dígitos)
 * validateDNI('');          // false
 * ```
 */
export function validateDNI(dni: string): boolean {
  if (!dni || typeof dni !== 'string') {
    return false;
  }

  const normalized = dni.trim().toUpperCase();
  const match = normalized.match(DNI_REGEX);

  if (!match) {
    return false;
  }

  const [, digits, letter] = match;
  const numberValue = parseInt(digits, 10);
  const expectedLetter = DNI_LETTERS[numberValue % 23];

  return letter === expectedLetter;
}

/**
 * Valida un NIE español (Número de Identidad de Extranjero).
 *
 * El algoritmo reemplaza el prefijo (X→0, Y→1, Z→2) para formar un número
 * de 8 dígitos, y luego aplica la misma validación de letra que el DNI.
 *
 * @param nie - Cadena con el NIE a validar (X/Y/Z + 7 dígitos + 1 letra).
 * @returns `true` si el NIE es válido, `false` en caso contrario.
 *
 * @example
 * ```ts
 * validateNIE('X1234567L'); // true
 * validateNIE('Y1234567X'); // true
 * validateNIE('Z1234567R'); // true
 * validateNIE('x1234567l'); // true (case insensitive)
 * validateNIE('A1234567L'); // false (prefijo inválido)
 * validateNIE('');          // false
 * ```
 */
export function validateNIE(nie: string): boolean {
  if (!nie || typeof nie !== 'string') {
    return false;
  }

  const normalized = nie.trim().toUpperCase();
  const match = normalized.match(NIE_REGEX);

  if (!match) {
    return false;
  }

  const [, prefix, digits, letter] = match;
  const numericPrefix = NIE_PREFIX_MAP[prefix];

  if (numericPrefix === undefined) {
    return false;
  }

  const fullNumber = numericPrefix + digits;
  const numberValue = parseInt(fullNumber, 10);
  const expectedLetter = DNI_LETTERS[numberValue % 23];

  return letter === expectedLetter;
}

/**
 * Valida un documento de identidad español (DNI o NIE).
 *
 * Detecta automáticamente el tipo de documento basándose en el primer carácter:
 * - Si empieza por dígito → se valida como DNI.
 * - Si empieza por X, Y o Z → se valida como NIE.
 * - Cualquier otro caso → inválido.
 *
 * @param doc - Cadena con el documento a validar.
 * @returns `true` si el documento es un DNI o NIE válido, `false` en caso contrario.
 *
 * @example
 * ```ts
 * validateDocumento('12345678Z');  // true (DNI válido)
 * validateDocumento('X1234567L');  // true (NIE válido)
 * validateDocumento(' 12345678z '); // true (trim + case insensitive)
 * validateDocumento('A1234567L');  // false (ni DNI ni NIE)
 * validateDocumento('');           // false
 * ```
 */
export function validateDocumento(doc: string): boolean {
  if (!doc || typeof doc !== 'string') {
    return false;
  }

  const normalized = doc.trim().toUpperCase();

  if (normalized.length === 0) {
    return false;
  }

  const firstChar = normalized[0];

  if (/\d/.test(firstChar)) {
    return validateDNI(normalized);
  }

  if (firstChar === 'X' || firstChar === 'Y' || firstChar === 'Z') {
    return validateNIE(normalized);
  }

  return false;
}

/**
 * Formatea un documento de identidad español a su forma canónica.
 *
 * Aplica `trim()` para eliminar espacios y `toUpperCase()` para normalizar
 * la letra a mayúscula. No valida el contenido del documento.
 *
 * @param doc - Cadena con el documento a formatear.
 * @returns El documento en formato canónico (sin espacios, en mayúsculas).
 *
 * @example
 * ```ts
 * formatDocumento(' 12345678z ');  // '12345678Z'
 * formatDocumento('x1234567l');    // 'X1234567L'
 * formatDocumento('  Y1234567X'); // 'Y1234567X'
 * ```
 */
export function formatDocumento(doc: string): string {
  return doc.trim().toUpperCase();
}

/**
 * Decisiones técnicas:
 * - Se usan constantes `as const` para DNI_LETTERS y NIE_PREFIX_MAP
 *   para garantizar inmutabilidad y mejor inferencia de tipos.
 * - Las funciones individuales (validateDNI, validateNIE) están expuestas
 *   además del wrapper (validateDocumento) para permitir validación específica
 *   cuando el tipo de documento ya es conocido por el contexto.
 * - Se normaliza la entrada (trim + toUpperCase) en cada función individual
 *   para que sean seguras de usar de forma independiente sin depender del wrapper.
 *
 * Edge cases cubiertos:
 * - Entrada null/undefined: Protegido con guard clause.
 * - Espacios en blanco: trim() antes de validar.
 * - Case sensitivity: toUpperCase() antes de comparar.
 * - Cadena vacía: Retorna false.
 * - Tipos incorrectos en runtime: typeof check como guard.
 */
