// Helpers.
const s = 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;
const w = d * 7;
const y = d * 365.25;

type Unit =
  | 'Years'
  | 'Year'
  | 'Yrs'
  | 'Yr'
  | 'Y'
  | 'Weeks'
  | 'Week'
  | 'W'
  | 'Days'
  | 'Day'
  | 'D'
  | 'Hours'
  | 'Hour'
  | 'Hrs'
  | 'Hr'
  | 'H'
  | 'Minutes'
  | 'Minute'
  | 'Mins'
  | 'Min'
  | 'M'
  | 'Seconds'
  | 'Second'
  | 'Secs'
  | 'Sec'
  | 's'
  | 'Milliseconds'
  | 'Millisecond'
  | 'Msecs'
  | 'Msec'
  | 'Ms';

type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>;

export type StringValue =
  | `${number}` // 表示数字组成的字符串
  | `${number}${UnitAnyCase}` // 数字和UnitAnyCase类型拼接
  | `${number} ${UnitAnyCase}`;// 数字，空格和UnitAnyCase类型拼接

interface Options {
  /**
   * Set to `true` to use verbose formatting. Defaults to `false`.
   */
  long?: boolean;
}

/**
 * Parse or format the given value.
 *
 * @param value - The string or number to convert
 * @param options - Options for the conversion
 * @throws Error if `value` is not a non-empty string or a number
 */
/**
 * 这样定义重载函数的目的是为了提供更好的类型检查和类型推断，以便在不同的参数类型下，
 * 编译器能够正确地确定函数的返回类型。实际执行时，只会使用最后一行的函数定义，即第三行的函数实现。
 * 前两行的声明只是用于类型检查和编译时的类型推断，以提供更好的开发体验和类型安全性。
 */
function msFn(value: StringValue, options?: Options): number;
function msFn(value: number, options?: Options): string;
function msFn(value: StringValue | number, options?: Options): number | string {
  try {
    if (typeof value === 'string' && value.length > 0) {
      return parse(value);
    } else if (typeof value === 'number' && isFinite(value)) {
      return options?.long ? fmtLong(value) : fmtShort(value);
    }
    throw new Error('Value is not a string or number.');
  } catch (error) {
    const message = isError(error)
      ? `${error.message}. value=${JSON.stringify(value)}`
      : 'An unknown error has occurred.';
    throw new Error(message);
  }
}

/**
 * Parse the given string and return milliseconds.毫秒
 *
 * @param str - A string to parse to milliseconds
 * @returns The parsed value in milliseconds, or `NaN` if the string can't be
 * parsed
 */
function parse(str: string): number {
  if (str.length > 100) {
    throw new Error('Value exceeds the maximum length of 100 characters.');
  }
  const match =
    /^(?<value>-?(?:\d+)?\.?\d+) *(?<type>milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str,
    );// 匹配的字符串可以是"10ms"、"-1.5s"、"2 hours"等。
  // 如果匹配成功，exec()方法将返回一个数组，其中第一个元素是整个匹配的字符串，后续元素是每个命名捕获组的匹配结果。如果匹配失败，exec()方法将返回null。
  // 这段代码的目的是从字符串中提取数值和时间单位，以便后续的处理和转换。
  // Named capture groups need to be manually typed today.
  // https://github.com/microsoft/TypeScript/issues/32098
  const groups = match?.groups as { value: string; type?: string } | undefined;
  if (!groups) {
    return NaN;
  }
  const n = parseFloat(groups.value);
  const type = (groups.type || 'ms').toLowerCase() as Lowercase<Unit>;
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      // This should never occur.
      throw new Error(
        `The unit ${type as string} was matched, but no matching case exists.`,
      );
  }
}

// eslint-disable-next-line import/no-default-export
export default msFn;

/**
 * Short format for `ms`.
 */
function fmtShort(ms: number): StringValue {
  const msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return `${Math.round(ms / d)}d`;
  }
  if (msAbs >= h) {
    return `${Math.round(ms / h)}h`;
  }
  if (msAbs >= m) {
    return `${Math.round(ms / m)}m`;
  }
  if (msAbs >= s) {
    return `${Math.round(ms / s)}s`;
  }
  return `${ms}ms`;
}

/**
 * Long format for `ms`.
 */
function fmtLong(ms: number): StringValue {
  const msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return `${ms} ms`;
}

/**
 * Pluralization helper.
 */
function plural(
  ms: number,
  msAbs: number,
  n: number,
  name: string,
): StringValue {
  const isPlural = msAbs >= n * 1.5;
  return `${Math.round(ms / n)} ${name}${isPlural ? 's' : ''}` as StringValue;
}

/**
 * A type guard for errors.
 *
 * @param value - The value to test
 * @returns A boolean `true` if the provided value is an Error-like object
 */
function isError(value: unknown): value is Error {
  return typeof value === 'object' && value !== null && 'message' in value;
}
