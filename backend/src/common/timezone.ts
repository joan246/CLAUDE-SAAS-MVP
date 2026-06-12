export function getTimezoneOffset(timeZone: string, date: Date): number {
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };
  
  const year = getPart('year');
  const month = getPart('month') - 1;
  const day = getPart('day');
  let hour = getPart('hour');
  if (hour === 24) hour = 0;
  const minute = getPart('minute');
  const second = getPart('second');
  
  const localTime = Date.UTC(year, month, day, hour, minute, second);
  return (localTime - utc) / 60000;
}

export function localToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  const tempUtc = new Date(Date.UTC(y, m - 1, d, h, min, 0));
  const offsetMin = getTimezoneOffset(timeZone, tempUtc);
  return new Date(tempUtc.getTime() - offsetMin * 60000);
}

export function utcToLocalParts(utcDate: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(utcDate);
  const getPart = (type: string) => {
    const part = parts.find(p => p.type === type);
    return part ? part.value : '00';
  };
  
  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  };
}

export function utcToLocalDateStr(utcDate: Date, timeZone: string): string {
  const parts = utcToLocalParts(utcDate, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function utcToLocalTimeStr(utcDate: Date, timeZone: string): string {
  const parts = utcToLocalParts(utcDate, timeZone);
  return `${parts.hour}:${parts.minute}`;
}
