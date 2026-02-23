import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { addMonths, subMonths, startOfMonth, format, isSameDay, differenceInDays } from 'date-fns';
import { Solar, HolidayUtil } from 'lunar-javascript';
import { cn } from '../utils/cn';
import { Star, Calendar as CalendarIcon, X, Plus, Clock, ChevronDown } from 'lucide-react';

interface CustomHoliday {
  id: string;
  name: string;
  start: string;
  end: string;
}

interface BaseDayData {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  lunarDay: string;
  festival: string;
  isBuiltInHoliday: boolean;
  isBuiltInWork: boolean;
  builtInHolidayName: string;
}

interface DayData extends BaseDayData {
  isHoliday: boolean;
  isWork: boolean;
  holidayName: string;
  isMarked: boolean;
}

const baseDayCache: Record<string, BaseDayData> = {};

const getBaseDayData = (date: Date, isCurrentMonth: boolean): BaseDayData => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const cacheKey = `${dateStr}-${isCurrentMonth}`;
  if (baseDayCache[cacheKey]) {
    return baseDayCache[cacheKey];
  }
  
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const lunar = solar.getLunar();
  const holiday = HolidayUtil.getHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate());
  
  let festival = '';
  const lunarFestivals = lunar.getFestivals();
  const solarFestivals = solar.getFestivals();
  const jieQi = lunar.getJieQi();
  
  if (lunarFestivals.length > 0) {
    festival = lunarFestivals[0];
  } else if (solarFestivals.length > 0) {
    festival = solarFestivals[0];
  } else if (jieQi) {
    festival = jieQi;
  }
  
  let lunarDay = lunar.getDayInChinese();
  if (lunarDay === '初一') {
    lunarDay = lunar.getMonthInChinese() + '月';
  }

  const data = {
    date,
    dateStr,
    isCurrentMonth,
    lunarDay,
    festival,
    isBuiltInHoliday: holiday ? !holiday.isWork() : false,
    isBuiltInWork: holiday ? holiday.isWork() : false,
    builtInHolidayName: holiday ? holiday.getName() : '',
  };
  
  baseDayCache[cacheKey] = data;
  return data;
};

const combineDayData = (base: BaseDayData, customHolidays: CustomHoliday[], markedDates: Set<string>): DayData => {
  let isHoliday = base.isBuiltInHoliday;
  let isWork = base.isBuiltInWork;
  let holidayName = base.builtInHolidayName;

  for (const ch of customHolidays) {
    if (base.dateStr >= ch.start && base.dateStr <= ch.end) {
      isHoliday = true;
      isWork = false;
      holidayName = ch.name;
      break;
    }
  }

  return {
    ...base,
    isHoliday,
    isWork,
    holidayName,
    isMarked: markedDates.has(base.dateStr)
  };
};

const MonthView = React.memo(React.forwardRef<HTMLDivElement, {
  month: Date;
  customHolidays: CustomHoliday[];
  markedDates: Set<string>;
  onDayClick: (date: Date) => void;
  selectedDate: Date | null;
  currentDate: Date;
}>(({ month, customHolidays, markedDates, onDayClick, selectedDate, currentDate }, ref) => {
  const days = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    
    const daysArr: DayData[] = [];
    
    const firstDayOfWeek = firstDay.getDay(); 
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; 
    
    for (let i = startOffset; i > 0; i--) {
      const d = new Date(year, m, 1 - i);
      daysArr.push(combineDayData(getBaseDayData(d, false), customHolidays, markedDates));
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, m, i);
      daysArr.push(combineDayData(getBaseDayData(d, true), customHolidays, markedDates));
    }
    
    const remainingDays = 42 - daysArr.length; 
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, m + 1, i);
      daysArr.push(combineDayData(getBaseDayData(d, false), customHolidays, markedDates));
    }
    
    return daysArr;
  }, [month, customHolidays, markedDates]);

  return (
    <div ref={ref} className="bg-white rounded-[2rem] shadow-sm border border-stone-100 p-4 sm:p-6 mb-6">
      <h2 className="text-xl font-bold mb-5 ml-2 text-stone-800">
        {format(month, 'M月')}
      </h2>
      <div className="grid grid-cols-7 gap-y-3 gap-x-1 sm:gap-x-2">
        {days.map((day, idx) => {
          const isTodayDate = isSameDay(day.date, currentDate);
          const isSelected = selectedDate ? isSameDay(day.date, selectedDate) : false;
          
          const prevDay = idx > 0 ? days[idx - 1] : null;
          const nextDay = idx < days.length - 1 ? days[idx + 1] : null;
          
          const isHolidayStart = day.isHoliday && (!prevDay || !prevDay.isHoliday || prevDay.holidayName !== day.holidayName);
          const isHolidayEnd = day.isHoliday && (!nextDay || !nextDay.isHoliday || nextDay.holidayName !== day.holidayName);

          const isRowStart = day.date.getDay() === 1; // Monday
          const isRowEnd = day.date.getDay() === 0; // Sunday
          
          const blockStart = isHolidayStart || isRowStart;
          const blockEnd = isHolidayEnd || isRowEnd;
          
          const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

          return (
            <div 
              key={idx} 
              onClick={() => onDayClick(day.date)}
              className={cn(
                "relative flex flex-col items-center justify-start py-2 transition-all cursor-pointer min-h-[70px] sm:min-h-[80px]",
                !day.isCurrentMonth && "opacity-30",
                isSelected ? "ring-2 ring-blue-500 bg-blue-50 rounded-2xl z-20 scale-105 shadow-sm" : "rounded-2xl",
                isTodayDate && !isSelected && "bg-blue-50/50",
                day.isWork && !isSelected && "bg-stone-100"
              )}
            >
              {/* Holiday continuous background block */}
              {day.isHoliday && !isSelected && (
                <div className={cn(
                  "absolute inset-y-1 bg-rose-50 z-0",
                  blockStart ? "left-1" : "-left-[2px] sm:-left-[4px]",
                  blockEnd ? "right-1" : "-right-[2px] sm:-right-[4px]",
                  blockStart ? "rounded-l-2xl" : "",
                  blockEnd ? "rounded-r-2xl" : "",
                  blockStart && blockEnd ? "left-1 right-1 rounded-2xl" : ""
                )} />
              )}

              {/* Date Number */}
              <span className={cn(
                "text-lg sm:text-xl font-bold z-10",
                isTodayDate ? "text-blue-600" : (isWeekend ? "text-stone-400" : "text-stone-800")
              )}>
                {day.date.getDate()}
              </span>
              
              {/* Lunar / Festival */}
              <span className={cn(
                "text-[10px] sm:text-xs mt-0.5 z-10 truncate w-full text-center px-0.5",
                day.festival ? "text-blue-500 font-medium" : "text-stone-400"
              )}>
                {day.festival || day.lunarDay}
              </span>

              {/* Marked Indicator */}
              {day.isMarked && (
                <div className="absolute top-1.5 left-1.5 w-2 h-2 bg-orange-500 rounded-full z-10 shadow-sm" />
              )}

              {/* Holiday / Work Badge */}
              {day.isHoliday && (
                <span className="absolute top-1 right-1 text-[9px] sm:text-[10px] text-rose-500 font-bold z-10">
                  休
                </span>
              )}
              {day.isWork && (
                <span className="absolute top-1 right-1 text-[9px] sm:text-[10px] text-stone-500 font-bold z-10">
                  班
                </span>
              )}
              
              {/* Holiday Name */}
              {day.isHoliday && isHolidayStart && day.holidayName && (
                <span className="absolute -bottom-1 left-0 right-0 text-center text-[9px] text-rose-600 font-bold z-10 truncate px-1">
                  {day.holidayName}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}));

export const Calendar: React.FC = () => {
  const [currentDate] = useState(new Date('2026-02-22T23:16:49-08:00'));
  const [months, setMonths] = useState<Date[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [activeMonth, setActiveMonth] = useState<Date>(currentDate);
  
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCustomHolidayForm, setShowCustomHolidayForm] = useState(false);
  const [holidayNameInput, setHolidayNameInput] = useState('');
  const [holidayEndInput, setHolidayEndInput] = useState('');

  useEffect(() => {
    const initialMonths = [];
    for (let i = -12; i <= 12; i++) {
      initialMonths.push(i === 0 ? startOfMonth(currentDate) : i < 0 ? subMonths(startOfMonth(currentDate), Math.abs(i)) : addMonths(startOfMonth(currentDate), i));
    }
    setMonths(initialMonths);
  }, [currentDate]);

  useEffect(() => {
    if (months.length > 0 && containerRef.current) {
      const currentMonthKey = format(startOfMonth(currentDate), 'yyyy-MM');
      const el = monthRefs.current[currentMonthKey];
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [months, currentDate]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    let closestMonth = activeMonth;
    let minDistance = Infinity;
    const containerTop = containerRef.current.scrollTop;
    
    Object.entries(monthRefs.current).forEach(([key, el]) => {
      if (el) {
        const distance = Math.abs((el as HTMLDivElement).offsetTop - containerTop);
        if (distance < minDistance) {
          minDistance = distance;
          const [year, month] = key.split('-');
          closestMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
        }
      }
    });
    
    if (closestMonth.getTime() !== activeMonth.getTime()) {
      setActiveMonth(closestMonth);
    }
  };

  const jumpToMonth = (date: Date) => {
    setActiveMonth(date);
    const newMonths = [];
    for (let i = -12; i <= 12; i++) {
      newMonths.push(i === 0 ? startOfMonth(date) : i < 0 ? subMonths(startOfMonth(date), Math.abs(i)) : addMonths(startOfMonth(date), i));
    }
    setMonths(newMonths);
    
    setTimeout(() => {
      const monthKey = format(date, 'yyyy-MM');
      const el = monthRefs.current[monthKey];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const holidayProgress = useMemo(() => {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    const ch = customHolidays.find(h => dateStr >= h.start && dateStr <= h.end);
    if (ch) {
      const start = new Date(ch.start + 'T00:00:00');
      const end = new Date(ch.end + 'T00:00:00');
      const total = differenceInDays(end, start) + 1;
      const current = differenceInDays(currentDate, start) + 1;
      return { name: ch.name, current, remaining: total - current };
    }
    
    const h = HolidayUtil.getHoliday(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
    if (h && !h.isWork()) {
      const name = h.getName();
      
      let startD = new Date(currentDate);
      while (true) {
        const prev = new Date(startD);
        prev.setDate(prev.getDate() - 1);
        const ph = HolidayUtil.getHoliday(prev.getFullYear(), prev.getMonth() + 1, prev.getDate());
        if (ph && !ph.isWork() && ph.getName() === name) {
          startD = prev;
        } else {
          break;
        }
      }
      
      let endD = new Date(currentDate);
      while (true) {
        const next = new Date(endD);
        next.setDate(next.getDate() + 1);
        const nh = HolidayUtil.getHoliday(next.getFullYear(), next.getMonth() + 1, next.getDate());
        if (nh && !nh.isWork() && nh.getName() === name) {
          endD = next;
        } else {
          break;
        }
      }
      
      const total = differenceInDays(endD, startD) + 1;
      const current = differenceInDays(currentDate, startD) + 1;
      return { name, current, remaining: total - current };
    }
    
    return null;
  }, [currentDate, customHolidays]);

  const toggleMark = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setMarkedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  const handleSaveCustomHoliday = () => {
    if (!selectedDate || !holidayNameInput || !holidayEndInput) return;
    
    const startStr = format(selectedDate, 'yyyy-MM-dd');
    if (holidayEndInput < startStr) return;

    const newHoliday: CustomHoliday = {
      id: Date.now().toString(),
      name: holidayNameInput,
      start: startStr,
      end: holidayEndInput
    };

    setCustomHolidays(prev => [...prev, newHoliday]);
    setShowCustomHolidayForm(false);
    setHolidayNameInput('');
    setHolidayEndInput('');
  };

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const isSelectedMarked = markedDates.has(selectedDateStr);
  const selectedBaseData = selectedDate ? getBaseDayData(selectedDate, true) : null;

  return (
    <div className="flex flex-col h-full bg-stone-100 font-sans relative overflow-hidden">
      {/* Fixed Blue Header */}
      <div className="flex-none bg-blue-600 rounded-b-[2.5rem] pt-12 pb-8 px-6 text-white shadow-lg z-20 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center space-x-1 cursor-pointer">
              <h1 className="text-3xl font-bold tracking-tight">
                {format(activeMonth, 'yyyy年 M月')}
              </h1>
              <ChevronDown className="w-6 h-6 opacity-80" />
              <input 
                type="month" 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={format(activeMonth, 'yyyy-MM')}
                onChange={(e) => {
                  if (e.target.value) {
                    jumpToMonth(new Date(e.target.value + '-01'));
                  }
                }}
              />
            </div>
            
            {/* Jump to Today Button */}
            <button 
              onClick={() => {
                jumpToMonth(currentDate);
                setSelectedDate(currentDate);
              }}
              className="flex flex-col items-center justify-center px-2.5 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg border border-white/30 transition-all shadow-sm active:scale-95"
              title="回到今天"
            >
              <span className="text-[10px] font-medium text-blue-100 leading-none mb-0.5">今</span>
              <span className="text-sm font-bold text-white leading-none">{currentDate.getDate()}</span>
            </button>
          </div>
          <div className="text-xs font-bold text-blue-100 bg-blue-500/50 px-3 py-1.5 rounded-full border border-blue-400/30">
            v0.0.4
          </div>
        </div>

        {/* Holiday Progress */}
        {holidayProgress && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/20 shadow-inner">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shadow-sm">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-blue-100 mb-0.5">{holidayProgress.name}</div>
                <div className="text-xl font-bold">第 {holidayProgress.current} 天</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-blue-100 mb-0.5">还剩</div>
              <div className="text-xl font-bold">{holidayProgress.remaining} 天</div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Weekdays */}
      <div className="flex-none px-4 sm:px-6 py-3 bg-stone-100 z-10 shadow-sm relative">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-stone-400 px-4 sm:px-6">
            {weekDays.map((day) => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Area */}
      <div 
        className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-40 scroll-smooth" 
        ref={containerRef} 
        onScroll={handleScroll}
      >
        <div className="max-w-3xl mx-auto">
          {months.map((month) => {
            const monthKey = format(month, 'yyyy-MM');
            return (
              <MonthView 
                key={monthKey}
                ref={(el) => monthRefs.current[monthKey] = el}
                month={month}
                customHolidays={customHolidays}
                markedDates={markedDates}
                onDayClick={(date) => {
                  setSelectedDate(date);
                  setShowCustomHolidayForm(false);
                }}
                selectedDate={selectedDate}
                currentDate={currentDate}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Panel Overlay */}
      {selectedDate && (
        <div 
          className="absolute inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setSelectedDate(null)}
        />
      )}

      {/* Bottom Panel */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.15)] z-50 p-6 sm:p-8 transition-transform duration-300 ease-out max-w-3xl mx-auto",
        selectedDate ? "translate-y-0" : "translate-y-full"
      )}>
        {selectedDate && (
          <>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-stone-800">
                  {format(selectedDate, 'yyyy年MM月dd日')}
                </h3>
                <p className="text-stone-500 mt-1.5 font-medium flex items-center space-x-2">
                  <span>{selectedBaseData?.lunarDay}</span>
                  {selectedBaseData?.festival && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-stone-300" />
                      <span className="text-blue-500">{selectedBaseData.festival}</span>
                    </>
                  )}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDate(null)} 
                className="p-2.5 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showCustomHolidayForm ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-lg font-bold text-stone-800 mb-4">添加自定义节假日</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-500 mb-1.5">节假日名称</label>
                    <input 
                      type="text" 
                      value={holidayNameInput}
                      onChange={e => setHolidayNameInput(e.target.value)}
                      className="w-full bg-stone-100 border-2 border-transparent rounded-2xl px-4 py-3.5 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                      placeholder="例如：年假、生日"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-stone-500 mb-1.5">开始日期</label>
                      <input 
                        type="date" 
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        disabled
                        className="w-full bg-stone-100 border-2 border-transparent rounded-2xl px-4 py-3.5 text-stone-500 outline-none font-medium opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-stone-500 mb-1.5">结束日期</label>
                      <input 
                        type="date" 
                        value={holidayEndInput}
                        onChange={e => setHolidayEndInput(e.target.value)}
                        min={format(selectedDate, 'yyyy-MM-dd')}
                        className="w-full bg-stone-100 border-2 border-transparent rounded-2xl px-4 py-3.5 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button 
                      onClick={() => setShowCustomHolidayForm(false)}
                      className="flex-1 py-3.5 rounded-2xl font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                    >
                      取消
                    </button>
                    <button 
                      onClick={handleSaveCustomHoliday}
                      disabled={!holidayNameInput || !holidayEndInput}
                      className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                {/* Date Calculator */}
                <div className="bg-blue-50 rounded-2xl p-5 mb-6 flex items-center justify-between border border-blue-100/50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-600/80 font-bold mb-0.5">距离今天</div>
                      <div className="text-xl font-bold text-blue-700">
                        {differenceInDays(selectedDate, currentDate) > 0 
                          ? `还有 ${differenceInDays(selectedDate, currentDate)} 天` 
                          : differenceInDays(selectedDate, currentDate) < 0 
                            ? `已过 ${Math.abs(differenceInDays(selectedDate, currentDate))} 天`
                            : '就是今天'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => toggleMark(selectedDate)}
                    className={cn(
                      "flex flex-col items-center justify-center py-5 rounded-2xl border-2 transition-all",
                      isSelectedMarked 
                        ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm" 
                        : "border-stone-100 bg-stone-50 text-stone-600 hover:bg-stone-100 hover:border-stone-200"
                    )}
                  >
                    <Star className={cn("w-7 h-7 mb-2.5", isSelectedMarked && "fill-current")} />
                    <span className="text-sm font-bold">{isSelectedMarked ? '已标记重要' : '标记为重要'}</span>
                  </button>

                  <button 
                    onClick={() => setShowCustomHolidayForm(true)}
                    className="flex flex-col items-center justify-center py-5 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all"
                  >
                    <Plus className="w-7 h-7 mb-2.5" />
                    <span className="text-sm font-bold">设为节假日</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
