import PropTypes from 'prop-types';
import XDate from 'xdate';
import isEmpty from 'lodash/isEmpty';
import React, {useRef, useState, useEffect, useCallback, useMemo} from 'react';
import {AccessibilityInfo, View, Text, TouchableOpacity, Dimensions, Platform, ViewStyle, StyleProp} from 'react-native';
// @ts-expect-error
import GestureRecognizer, {swipeDirections} from 'react-native-swipe-gestures';
import constants from '../commons/constants';
import {page, isGTE, isLTE, sameMonth} from '../dateutils';
import {xdateToData, parseDate, toMarkingFormat} from '../interface';
import {getState} from '../day-state-manager';
import {extractHeaderProps, extractDayProps} from '../componentUpdater';
import {DateData, Theme, MarkedDates, ContextProp, EventData} from '../types';
import {useDidUpdate} from '../hooks';
import styleConstructor from './style';
import CalendarHeader, {CalendarHeaderProps} from './header';
import Day, {DayProps} from './day/index';
import BasicDay from './day/basic';

export interface CalendarProps extends CalendarHeaderProps, DayProps {
  /** Specify theme properties to override specific styles for calendar parts */
  theme?: Theme;
  /** Specify style for calendar container element */
  style?: StyleProp<ViewStyle>;
  /** Initially visible month */
  current?: string; // TODO: migrate to 'initialDate'
  /** Initially visible month. If changed will initialize the calendar to this value */
  initialDate?: string;
  /** Minimum date that can be selected, dates before minDate will be grayed out */
  minDate?: string;
  /** Maximum date that can be selected, dates after maxDate will be grayed out */
  maxDate?: string;
  /** Allow selection of dates before minDate or after maxDate */
  allowSelectionOutOfRange?: boolean;
  /** Collection of dates that have to be marked */
  markedDates?: MarkedDates;
  /** Do not show days of other months in month page */
  hideExtraDays?: boolean;
  /** Always show six weeks on each month (only when hideExtraDays = false) */
  showSixWeeks?: boolean;
  /** Handler which gets executed on day press */
  onDayPress?: (date: DateData) => void;
  /** Handler which gets executed on day long press */
  onDayLongPress?: (date: DateData) => void;
  /** Handler which gets executed when month changes in calendar */
  onMonthChange?: (date: DateData) => void;
  /** Handler which gets executed when visible month changes in calendar */
  onVisibleMonthsChange?: (months: DateData[]) => void;
  /** Disables changing month when click on days of other months (when hideExtraDays = false) */
  disableMonthChange?: boolean;
  /** Enable the option to swipe between months */
  enableSwipeMonths?: boolean;
  /** Style passed to the header */
  headerStyle?: StyleProp<ViewStyle>;
  /** Allow rendering a totally custom header */
  customHeader?: any;
  /** Disable days by default */
  disabledByDefault?: boolean;
  /** Disable dates by days of the week (Sunday=0) */
  disabledByWeekDays?: number[];
  /** Test ID */
  testID?: string;
  /** Events to render as colored bars on calendar days */
  events?: EventData[];
  /** Handler for when an event marker is pressed */
  onMarkerPress?: (event: EventData) => void;
}

/**
 * @description: Calendar component
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/calendars.js
 * @gif: https://github.com/wix/react-native-calendars/blob/master/demo/assets/calendar.gif
 */
const CALENDAR_COLORS = ['#2e7d32', '#f9a825', '#c62828', '#6a1b9a', '#1565c0'];
const {width: SCREEN_WIDTH} = Dimensions.get('window');
const calculateTextWidth = (text: string, fontSize: number) => text.length * fontSize * (2 / 3);

const Calendar = (props: CalendarProps & ContextProp) => {
  const {
    initialDate,
    current,
    theme,
    markedDates,
    minDate,
    maxDate,
    allowSelectionOutOfRange,
    onDayPress,
    onDayLongPress,
    onMonthChange,
    onVisibleMonthsChange,
    disableMonthChange,
    enableSwipeMonths,
    hideExtraDays,
    firstDay,
    showSixWeeks,
    displayLoadingIndicator,
    customHeader,
    headerStyle,
    accessibilityElementsHidden,
    importantForAccessibility,
    testID,
    style: propsStyle,
    events,
    onMarkerPress
  } = props;
  const [currentMonth, setCurrentMonth] = useState(current || initialDate ? parseDate(current || initialDate) : new XDate());
  const style = useRef(styleConstructor(theme));
  const header = useRef();
  const weekNumberMarking = useRef({disabled: true, disableTouchEvent: true});

  const currentEvents = useMemo(() => {
    if (!events || !events.length) return [];
    return [...events]
      .filter((item) => {
        const start = parseDate(item.start);
        const end = parseDate(item.end);
        const startOfTheMonth = parseDate(currentMonth.toString('yyyy-MM-01'));
        const endOfTheMonth = parseDate(startOfTheMonth.clone().addMonths(1).addDays(-1));
        const sameYear = start.getFullYear() === startOfTheMonth.getFullYear() || end.getFullYear() === endOfTheMonth.getFullYear();
        const weekInRange = !(start.getTime() > endOfTheMonth.getTime() || end.getTime() < startOfTheMonth.getTime());
        return (sameYear && weekInRange);
      })
      .sort((a, b) => parseDate(a.start).getTime() - parseDate(b.start).getTime())
      .map((item, key) => {
        const evt = {...item};
        if (!evt.color || evt.color === '') {
          evt.color = CALENDAR_COLORS[key % CALENDAR_COLORS.length];
        }
        const textWidth = calculateTextWidth(evt.text, 14) + 40;
        const dayWidth = Math.floor(SCREEN_WIDTH / 7);
        const startDate = parseDate(evt.start);
        const endDate = parseDate(evt.end);
        let weekStart = startDate.getWeek();
        let weekEnd = endDate.getWeek();
        let weekDay = startDate.getDay();
        let weekDayEnd = endDate.getDay();
        const spaceCellStart = 7 - weekDay;
        let currentWeek = weekStart + (weekDay === 0 ? 1 : 0);
        const totalWidth = (dayWidth * spaceCellStart);
        let shouldEllipsis = totalWidth - textWidth < 0;
        const originalWeekStart = currentWeek;
        const originalWeekEnd = weekEnd;
        if (weekDay !== 0) {
          weekStart -= 1;
        }
        if (weekDayEnd === 0) {
          weekEnd += 1;
          weekDayEnd += 1;
        }
        if (shouldEllipsis && originalWeekStart !== originalWeekEnd && totalWidth < textWidth) {
          if (originalWeekStart < originalWeekEnd) {
            currentWeek = originalWeekStart + (weekDay === 0 ? 2 : 1);
            shouldEllipsis = false;
          } else {
            if (weekDayEnd > spaceCellStart) {
              currentWeek = originalWeekEnd;
              shouldEllipsis = (dayWidth * weekDayEnd) - textWidth < 0;
            }
          }
        }
        // Calculate which month the event should be flagged in (for month-boundary crossovers)
        let supposedMonth = currentMonth.getMonth();
        let endSupposedMonth = currentMonth.getMonth();

        const endMonth = currentMonth.clone().addMonths(1).addDays(-1);
        const startWeekOfEndMonth = endMonth.clone().setDate(endMonth.getDate() - endMonth.getDay());
        const endOfWeek = startWeekOfEndMonth.clone().addDays(6);

        const startMonth = currentMonth.clone().setDate(1);
        const startWeekOfStartMonth = startMonth.clone().addDays(-(startMonth.getDay()));
        const endWeekOfStartMonth = startWeekOfStartMonth.clone().addDays(6);

        if (startDate.getTime() >= startWeekOfEndMonth.getTime() && endDate.getTime() >= endMonth.getTime()) {
          const startGap = Math.abs(startDate.diffDays(endMonth)) + 0.5;
          let end = endDate.clone();
          if (end.getTime() > endOfWeek.getTime()) {
            end = endOfWeek
          }
          const endGap = Math.abs(endMonth.diffDays(end)) - 0.5;
          if (endGap > startGap) {
            supposedMonth = endOfWeek.getMonth();
          }
          endSupposedMonth = endOfWeek.getMonth();
        }
        if (startMonth.getTime() >= startDate.getTime() && startMonth.getTime() <= endDate.getTime()) {
          const startGap = Math.abs(startDate.diffDays(startMonth)) - 0.5;
          let end = endDate.clone();
          if (end.getTime() > endWeekOfStartMonth.getTime()) {
            end = endWeekOfStartMonth;
          }
          const endGap = Math.abs(startMonth.diffDays(end)) + 0.5;
          if (startGap > endGap) {
            supposedMonth = startWeekOfStartMonth.getMonth();
          }
        }

        return {
          ...evt,
          color: evt.color || CALENDAR_COLORS[key % CALENDAR_COLORS.length],
          showTextAt: currentWeek,
          weekStart,
          weekEnd,
          shouldEllipsis: shouldEllipsis || Math.abs(startDate.diffDays(endDate)) <= 2,
          flagAt: [weekStart, supposedMonth, endSupposedMonth],
          startDate,
          endDate,
        };
      });
  }, [events, currentMonth]);

  useEffect(() => {
    if (initialDate) {
      setCurrentMonth(parseDate(initialDate));
    }
  }, [initialDate]);

  useDidUpdate(() => {
    const _currentMonth = currentMonth.clone();
    onMonthChange?.(xdateToData(_currentMonth));
    onVisibleMonthsChange?.([xdateToData(_currentMonth)]);
    AccessibilityInfo.announceForAccessibility(_currentMonth.toString('MMMM yyyy'));
  }, [currentMonth]);

  const updateMonth = useCallback((newMonth: XDate) => {
    if (sameMonth(newMonth, currentMonth)) {
      return;
    }
    setCurrentMonth(newMonth);
  }, [currentMonth]);

  const addMonth = useCallback((count: number) => {
    const newMonth = currentMonth.clone().addMonths(count, true);
    updateMonth(newMonth);
  }, [currentMonth, updateMonth]);

  const handleDayInteraction = useCallback((date: DateData, interaction?: (date: DateData) => void) => {
    const day = new XDate(date.dateString);

    if (allowSelectionOutOfRange || !(minDate && !isGTE(day, new XDate(minDate))) && !(maxDate && !isLTE(day, new XDate(maxDate)))) {
      if (!disableMonthChange) {
        updateMonth(day);
      }
      if (interaction) {
        interaction(date);
      }
    }
  }, [minDate, maxDate, allowSelectionOutOfRange, disableMonthChange, updateMonth]);

  const _onDayPress = useCallback((date?: DateData) => {
    if (date)
    handleDayInteraction(date, onDayPress);
  }, [handleDayInteraction, onDayPress]);

  const onLongPressDay = useCallback((date?: DateData) => {
    if (date)
    handleDayInteraction(date, onDayLongPress);
  }, [handleDayInteraction, onDayLongPress]);

  const onSwipeLeft = useCallback(() => {
    // @ts-expect-error
    header.current?.onPressRight();
  }, [header]);

  const onSwipeRight = useCallback(() => {
    // @ts-expect-error
    header.current?.onPressLeft();
  }, [header]);

  const onSwipe = useCallback((gestureName: string) => {
    const {SWIPE_UP, SWIPE_DOWN, SWIPE_LEFT, SWIPE_RIGHT} = swipeDirections;

    switch (gestureName) {
      case SWIPE_UP:
      case SWIPE_DOWN:
        break;
      case SWIPE_LEFT:
        constants.isRTL ? onSwipeRight() : onSwipeLeft();
        break;
      case SWIPE_RIGHT:
        constants.isRTL ? onSwipeLeft() : onSwipeRight();
        break;
    }
  }, [onSwipeLeft, onSwipeRight]);

  const renderWeekNumber = (weekNumber: number) => {
    return (
      <View style={style.current.dayContainer} key={`week-container-${weekNumber}`}>
        <BasicDay
          key={`week-${weekNumber}`}
          marking={weekNumberMarking.current}
          // state='disabled'
          theme={theme}
          testID={`${testID}.weekNumber_${weekNumber}`}
        >
          {weekNumber}
        </BasicDay>
      </View>
    );
  };

  const renderDay = (day: XDate, id: number) => {
    if (!sameMonth(day, currentMonth) && hideExtraDays) {
      return <View key={id} style={style.current.emptyDayContainer}/>;
    }

    const dayProps = extractDayProps(props);
    const dateString = toMarkingFormat(day);
    const disableDaySelection = isEmpty(props.context);

    return (
      <View style={style.current.dayContainer} key={id}>
        <Day
          {...dayProps}
          testID={`${testID}.day_${dateString}`}
          date={dateString}
          state={getState(day, currentMonth, props, disableDaySelection)}
          marking={markedDates?.[dateString]}
          onPress={_onDayPress}
          onLongPress={onLongPressDay}
        />
      </View>
    );
  };

  const renderWeek = (days: XDate[], id: number) => {
    const week: JSX.Element[] = [];

    days.forEach((day: XDate, id2: number) => {
      week.push(renderDay(day, id2));
    });

    if (props.showWeekNumbers) {
      week.unshift(renderWeekNumber(days[days.length - 1].getWeek()));
    }

    const result = [
      <View style={style.current.week} key={`week-row-${id}`}>
        {week}
      </View>,
    ];

    if (events && events.length > 0 && currentEvents.length > 0) {
      let weekWeight = 7;
      const currentMonthClone = currentMonth.clone();
      const startMonthDt = currentMonthClone.clone().setDate(1);
      const endMonthDt = startMonthDt.clone().addMonths(1).addDays(-1);
      const isStartMonth = startMonthDt.getDay() !== 0
        && startMonthDt.getWeek() - 1 === days[0].getWeek();
      const isEndMonth = (endMonthDt.getDay() !== 6 && endMonthDt.getDay() !== 0
        && endMonthDt.getWeek() === days[days.length - 1].getWeek()) ||
        (endMonthDt.getDay() === 0 && endMonthDt.getWeek() + 1 === days[days.length - 1].getWeek());

      const eventsThisWeek = currentEvents.filter((event: any) => {
        const startDt = event.startDate;
        const endDt = event.endDate;
        let [wStart, wEnd] = [startDt, endDt].map((date: XDate) => date.getWeek());
        const currentEndWeek = days[days.length - 1].getWeek();
        if (startDt.getDay() === 0) {
          wStart += 1;
        }
        if (endDt.getDay() === 0) {
          wEnd += 1;
        }
        const weekRange = Array.from({length: Math.abs(wStart - wEnd) + 1}, (_item: any, index: number) => index + wStart);
        return weekRange.includes(currentEndWeek);
      }).reduce((all: any[], event: any) => {
        let start = event.startDate.clone();
        let end = event.endDate.clone();
        let weight = 0;

        if (isStartMonth && start.getTime() < startMonthDt.getTime()) {
          start = startMonthDt.clone();
          weight += 0.5;
        }
        if (isEndMonth && end.getTime() > endMonthDt.getTime()) {
          end = endMonthDt.clone();
          weight += 0.5;
        }
        if (start.getTime() < days[0].getTime()) {
          start = days[0].clone();
          weight += 0.5;
        }
        if (end.getTime() > days[days.length - 1].getTime()) {
          end = days[days.length - 1].clone();
          weight += 0.5;
        }
        // add gap if last event doesn't abut this one
        if (all.length > 0 && parseDate(all[all.length - 1].end).getTime() !== start.getTime()) {
          all.push({
            isGap: true,
            weight: Math.abs(parseDate(all[all.length - 1].end).diffDays(start)),
          });
        }
        weight = weight + Math.abs(start.diffDays(end));
        all.push({
          ...event,
          weight,
        });
        weekWeight -= weight;
        return all;
      }, []);

      if (eventsThisWeek.length > 0) {
        const eventStyle: any = {
          flexDirection: 'row',
          position: 'absolute',
          top: 25,
        };
        const eventStartDt = parseDate(eventsThisWeek[0].start);
        const eventEndDt = parseDate(eventsThisWeek[eventsThisWeek.length - 1].end);
        let cellBefore = isStartMonth ? startMonthDt.getDay() : 0;
        let cellAfter = isEndMonth ? 6 - endMonthDt.getDay() : 0;
        const weekStartTime = !isStartMonth ? days[0] : startMonthDt;
        const weekEndTime = !isEndMonth ? days[days.length - 1] : endMonthDt;

        if (weekWeight > 0) {
          if (eventStartDt.getTime() >= weekStartTime.getTime()) {
            cellBefore += 0.5;
            weekWeight -= 0.5;
          }
          if (eventEndDt.getTime() <= weekEndTime.getTime()) {
            cellAfter += 0.5;
            weekWeight -= 0.5;
          }
          if (eventStartDt.getTime() > weekStartTime.getTime()) {
            const diffStart = Math.abs(eventStartDt.diffDays(weekStartTime));
            cellBefore += diffStart;
            weekWeight -= diffStart;
          }
          if (eventEndDt.getTime() < weekEndTime.getTime()) {
            const diffEnd = Math.abs(eventEndDt.diffDays(weekEndTime));
            cellAfter += diffEnd;
            weekWeight -= diffEnd;
          }
        }

        result.push(
          <View style={eventStyle} key={`events-${id}`}>
            {cellBefore > 0 && <View style={{flex: cellBefore, minHeight: 10, zIndex: -1}} />}
            {eventsThisWeek.map((item: any, i: number) =>
              item.isGap ? (
                <View key={`gap-${i}`} style={{flex: item.weight, minHeight: 10}} />
              ) : (
                <View
                  key={item.reservation?.booking_id || `booking-${i}`}
                  style={[
                    {flex: item.weight, top: -20, minHeight: 25},
                    item.currentEdit ? {
                      zIndex: -1,
                      opacity: 0.5,
                      top: Platform.OS === 'android' ? -20 : 0,
                      height: Platform.OS === 'android' ? 30 : 10,
                    } : null,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      style.current.markerContainer,
                      {backgroundColor: item.color, minHeight: 30},
                      style.current.marker,
                      item.weekStart === days[0].getWeek() &&
                      parseDate(item.start).getMonth() === currentMonth.getMonth()
                        ? style.current.markerStart
                        : null,
                      item.weekEnd === days[days.length - 1].getWeek() &&
                      parseDate(item.end).getMonth() === currentMonth.getMonth()
                        ? style.current.markerEnd
                        : null,
                    ]}
                    onPress={() => onMarkerPress?.(item)}
                  >
                    {item.weekStart === days[0].getWeek() &&
                    item.flagAt?.[1] === currentMonth.getMonth()
                      ? item.before
                      : null}
                    <Text style={style.current.markerText}>
                      {item.weight > 1.5
                        ? item.showTextAt === days[0].getWeek() + 1
                          ? item.shouldEllipsis
                            ? ` `
                            : item.text
                          : ' '
                        : ' '}
                    </Text>
                    {item.weekEnd === days[days.length - 1].getWeek()
                      ? item.after
                      : null}
                  </TouchableOpacity>
                </View>
              )
            )}
            {cellAfter > 0 && <View style={{flex: cellAfter, minHeight: 10, zIndex: -1}} />}
          </View>
        );
      }
    }

    return (
      <View style={style.current.weekContainer} key={id}>
        {result}
      </View>
    );
  };

  const renderMonth = () => {
    const shouldShowSixWeeks = showSixWeeks && !hideExtraDays;
    const days = page(currentMonth, firstDay, shouldShowSixWeeks);
    const weeks: JSX.Element[] = [];

    while (days.length) {
      weeks.push(renderWeek(days.splice(0, 7), weeks.length));
    }

    return <View style={style.current.monthView}>{weeks}</View>;
  };

  const shouldDisplayIndicator = useMemo(() => {
    if (currentMonth) {
      const lastMonthOfDay = toMarkingFormat(currentMonth.clone().addMonths(1, true).setDate(1).addDays(-1));
      if (displayLoadingIndicator && !markedDates?.[lastMonthOfDay]) {
        return true;
      }
    }
    return false;
  }, [currentMonth, displayLoadingIndicator, markedDates]);

  const renderHeader = () => {
    const headerProps = extractHeaderProps(props);
    const ref = customHeader ? undefined : header;
    const CustomHeader = customHeader;
    const HeaderComponent = customHeader ? CustomHeader : CalendarHeader;

    return (
      <HeaderComponent
        {...headerProps}
        testID={`${testID}.header`}
        style={headerStyle}
        ref={ref}
        month={currentMonth}
        addMonth={addMonth}
        displayLoadingIndicator={shouldDisplayIndicator}
      />
    );
  };

  const GestureComponent = enableSwipeMonths ? GestureRecognizer : View;
  const swipeProps = {
    onSwipe: (direction: string) => onSwipe(direction)
  };
  const gestureProps = enableSwipeMonths ? swipeProps : undefined;

  return (
    <GestureComponent {...gestureProps} testID={`${testID}.container`}>
      <View
        style={[style.current.container, propsStyle]}
        testID={testID}
        accessibilityElementsHidden={accessibilityElementsHidden} // iOS
        importantForAccessibility={importantForAccessibility} // Android
      >
        {renderHeader()}
        {renderMonth()}
      </View>
    </GestureComponent>
  );
};

export default Calendar;
Calendar.displayName = 'Calendar';
Calendar.propTypes = {
  ...CalendarHeader.propTypes,
  ...Day.propTypes,
  theme: PropTypes.object,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
  current: PropTypes.string,
  initialDate: PropTypes.string,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  markedDates: PropTypes.object,
  hideExtraDays: PropTypes.bool,
  showSixWeeks: PropTypes.bool,
  onDayPress: PropTypes.func,
  onDayLongPress: PropTypes.func,
  onMonthChange: PropTypes.func,
  onVisibleMonthsChange: PropTypes.func,
  disableMonthChange: PropTypes.bool,
  enableSwipeMonths: PropTypes.bool,
  disabledByDefault: PropTypes.bool,
  headerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.number, PropTypes.array]),
  customHeader: PropTypes.any,
  allowSelectionOutOfRange: PropTypes.bool
};
