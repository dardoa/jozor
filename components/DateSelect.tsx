import React, { useEffect, useState, memo } from 'react';

interface DateSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const DateSelect: React.FC<DateSelectProps> = memo(({ value, onChange, disabled }) => {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Parse value on mount or change
  useEffect(() => {
    if (!value) {
      setDay('');
      setMonth('');
      setYear('');
      return;
    }
    
    const parts = value.split('-');
    // Format assumed: YYYY-MM-DD or YYYY-MM or YYYY
    setYear(parts[0] || '');
    setMonth(parts[1] || '');
    setDay(parts[2] || '');
  }, [value]);

  const updateDate = (d: string, m: string, y: string) => {
    // Logic: 
    // If Year is empty -> return empty (clears date)
    // If Year exists, construct string based on what else exists.
    // We allow partial dates (e.g. "1990" or "1990-05")
    
    const cleanYear = y.trim();
    
    if (!cleanYear) {
      onChange('');
      return;
    }

    let dateStr = cleanYear;
    if (m) {
      dateStr += `-${m}`;
      if (d) {
        dateStr += `-${d}`;
      }
    }
    
    onChange(dateStr);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDay(val);
    updateDate(val, month, year);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setMonth(val);
    // If clearing month, we must clear day too to maintain hierarchy (YYYY-MM-DD)
    const newDay = val === '' ? '' : day;
    if (val === '') setDay(''); 
    updateDate(newDay, val, year);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYear(val);
    updateDate(day, month, val);
  };

  const inputBaseClass = "h-8 px-2 border border-stone-300 dark:border-stone-600 rounded-lg text-sm focus:border-teal-500 outline-none transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100";
  const disabledClass = "disabled:bg-stone-50 dark:disabled:bg-stone-700 disabled:text-stone-400 disabled:border-stone-200 dark:disabled:border-stone-700";

  const months = [
    { v: '01', l: 'Jan' }, { v: '02', l: 'Feb' }, { v: '03', l: 'Mar' },
    { v: '04', l: 'Apr' }, { v: '05', l: 'May' }, { v: '06', l: 'Jun' },
    { v: '07', l: 'Jul' }, { v: '08', l: 'Aug' }, { v: '09', l: 'Sep' },
    { v: '10', l: 'Oct' }, { v: '11', l: 'Nov' }, { v: '12', l: 'Dec' }
  ];

  const days = Array.from({ length: 31 }, (_, i) => {
    const d = (i + 1).toString().padStart(2, '0');
    return d;
  });

  return (
    <div className="flex items-center gap-2 flex-1">
      {/* Day Select */}
      <select 
        value={day} 
        onChange={handleDayChange} 
        disabled={disabled || !month} // Disable day if no month selected
        className={`w-16 ${inputBaseClass} ${disabledClass}`} 
      >
        <option value="">DD</option>
        {days.map(d => (
          <option key={d} value={d}>{parseInt(d)}</option>
        ))}
      </select>

      {/* Month Select */}
      <select 
        value={month} 
        onChange={handleMonthChange} 
        disabled={disabled}
        className={`w-20 ${inputBaseClass} ${disabledClass}`} 
      >
        <option value="">MM</option>
        {months.map(m => (
          <option key={m.v} value={m.v}>{m.l}</option>
        ))}
      </select>

      {/* Year Input */}
      <input 
        type="text" 
        value={year} 
        onChange={handleYearChange} 
        disabled={disabled}
        placeholder="YYYY"
        maxLength={4}
        className={`w-20 text-center ${inputBaseClass} ${disabledClass}`} 
      />
    </div>
  );
});