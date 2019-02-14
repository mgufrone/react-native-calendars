import React, {Component} from 'react';
import {
  View,
  Text,
  Dimensions,
  ViewPropTypes,
  TouchableOpacity,
  Platform
} from 'react-native';
import PropTypes from 'prop-types';

import XDate from 'xdate';
import dateutils from '../dateutils';
import {xdateToData, parseDate} from '../interface';
import styleConstructor from './style';
import Day from './day/basic';
import UnitDay from './day/period';
import MultiDotDay from './day/multi-dot';
import MultiPeriodDay from './day/multi-period';
import SingleDay from './day/custom';
import CalendarHeader from './header';
import shouldComponentUpdate from './updater';
const COLORS = [
  '#2e7d32',
  '#f9a825',
  '#c62828',
  '#6a1b9a',
  '#1565c0',
];
const { width } = Dimensions.get('window');
const calculateTextWidth = (text, fontSize) => text.length * fontSize * (2/3);

//Fallback when RN version is < 0.44
const viewPropTypes = ViewPropTypes || View.propTypes;

const EmptyArray = [];

class Calendar extends Component {
  static propTypes = {
    // Specify theme properties to override specific styles for calendar parts. Default = {}
    theme: PropTypes.object,
    // Collection of dates that have to be marked. Default = {}
    markedDates: PropTypes.object,

    // Specify style for calendar container element. Default = {}
    style: viewPropTypes.style,
    // Initially visible month. Default = Date()
    current: PropTypes.any,
    // Minimum date that can be selected, dates before minDate will be grayed out. Default = undefined
    minDate: PropTypes.any,
    // Maximum date that can be selected, dates after maxDate will be grayed out. Default = undefined
    maxDate: PropTypes.any,

    // If firstDay=1 week starts from Monday. Note that dayNames and dayNamesShort should still start from Sunday.
    firstDay: PropTypes.number,

    // Date marking style [simple/period/multi-dot/multi-period]. Default = 'simple'
    markingType: PropTypes.string,

    // Hide month navigation arrows. Default = false
    hideArrows: PropTypes.bool,
    // Display loading indicador. Default = false
    displayLoadingIndicator: PropTypes.bool,
    // Do not show days of other months in month page. Default = false
    hideExtraDays: PropTypes.bool,

    // Handler which gets executed on day press. Default = undefined
    onDayPress: PropTypes.func,
    // Handler which gets executed on day long press. Default = undefined
    onDayLongPress: PropTypes.func,
    // Handler which gets executed when visible month changes in calendar. Default = undefined
    onMonthChange: PropTypes.func,
    onVisibleMonthsChange: PropTypes.func,
    // Replace default arrows with custom ones (direction can be 'left' or 'right')
    renderArrow: PropTypes.func,
    // Provide custom day rendering component
    dayComponent: PropTypes.any,
    // Month format in calendar title. Formatting values: http://arshaw.com/xdate/#Formatting
    monthFormat: PropTypes.string,
    // Disables changing month when click on days of other months (when hideExtraDays is false). Default = false
    disableMonthChange: PropTypes.bool,
    //  Hide day names. Default = false
    hideDayNames: PropTypes.bool,
    // Disable days by default. Default = false
    disabledByDefault: PropTypes.bool,
    // Show week numbers. Default = false
    showWeekNumbers: PropTypes.bool,
    // Handler which gets executed when press arrow icon left. It receive a callback can go back month
    onPressArrowLeft: PropTypes.func,
    // Handler which gets executed when press arrow icon left. It receive a callback can go next month
    onPressArrowRight: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.style = styleConstructor(this.props.theme);
    let currentMonth;
    let currentYear;
    if (props.current) {
      currentMonth = parseDate(props.current);
    } else {
      currentMonth = XDate();
    }
    this.state = {
      currentMonth,
    };

    this.updateMonth = this.updateMonth.bind(this);
    this.addMonth = this.addMonth.bind(this);
    this.pressDay = this.pressDay.bind(this);
    this.longPressDay = this.longPressDay.bind(this);
    this.shouldComponentUpdate = shouldComponentUpdate;
    this.currentEvents = this.getCurrentEvents(this.props);
  }


  getCurrentEvents(props) {
    if (!props.events) {
      return [];
    }
    return [...props.events]
        .filter((item) => {
          const [start, end] = [item.start, item.end].map(parseDate);
          const startOfTheMonth = parseDate(this.state.currentMonth.toString('yyyy-MM-01'));
          const endOfTheMonth = parseDate(startOfTheMonth).addMonths(1).addDays(-1);
          const sameYear = start.getFullYear() === startOfTheMonth.getFullYear() || end.getFullYear() === endOfTheMonth.getFullYear();
          const weekInRange = !(start.getTime() > endOfTheMonth.getTime() || end.getTime() < startOfTheMonth.getTime());

          // if start and end is not in the month but the start is less than startOfTheMonth, include them
          const filter = (sameYear && weekInRange);
          return filter;
        })
        .sort((a, b) => parseDate(a.start).getTime() > parseDate(b.start))
        .map((item, key) => {
          if (!item.color || item.color === '') {
            item.color = COLORS[key % COLORS.length];
          }
          // calculate if the span of the text is fit to the view.
          // the tolerance would be based on how much space the event have on the sequence of the week
          // if the start day have a small space, it should be put on another longer week.
          // if the space of the next week is the same as the first one, it will make an ellipsis text
          const textWidth = calculateTextWidth(item.text, this.style.markerText.fontSize) + 40;
          const dayWidth = Math.floor(width / 7);
          const startDate = parseDate(item.start);
          const endDate = parseDate(item.end);
          let [weekStart, weekEnd] = [startDate, endDate].map((item) => item.getWeek());
          let weekDay = startDate.getDay();
          let weekDayEnd = endDate.getDay();
          const spaceCellStart = 7 - weekDay;
          let currentWeek = weekStart + (weekDay === 0 ? 1 : 0);
          let totalWidth = (dayWidth * spaceCellStart);
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
                shouldEllipsis = (dayWidth * weekEndDay) - textWidth < 0;
              }
            }
          }
          // if the event happen to be in-between of one month to another
          // we should calculate which partial week has the bigger for the respective event
          let supposedMonth = this.state.currentMonth.getMonth();
          let endSupposedMonth = this.state.currentMonth.getMonth();

          const endMonth = this.state.currentMonth.clone().addMonths(1).addDays(-1);
          const startWeekOfEndMonth = endMonth.clone().setDate(endMonth.getDate() - endMonth.getDay());
          const endOfWeek = startWeekOfEndMonth.clone().addDays(6);

          const startMonth = this.state.currentMonth.clone().setDate(1);
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

          return ({
            ...item,
            color: item.color || COLORS[key % COLORS.length],
            showTextAt: currentWeek,
            weekStart,
            weekEnd,
            shouldEllipsis: shouldEllipsis || Math.abs(startDate.diffDays(endDate)) <= 2,
            flagAt: [weekStart, supposedMonth, endSupposedMonth],
          });
        });
  }

  componentWillReceiveProps(nextProps) {
    const current= parseDate(nextProps.current);
    if (current && current.toString('yyyy MM') !== this.state.currentMonth.toString('yyyy MM')) {
      this.setState({
        currentMonth: current.clone()
      });
    }
    this.currentEvents = this.getCurrentEvents(nextProps);
  }

  updateMonth(day, doNotTriggerListeners) {
    if (day.toString('yyyy MM') === this.state.currentMonth.toString('yyyy MM')) {
      return;
    }
    this.setState({
      currentMonth: day.clone()
    }, () => {
      if (!doNotTriggerListeners) {
        const currMont = this.state.currentMonth.clone();
        if (this.props.onMonthChange) {
          this.props.onMonthChange(xdateToData(currMont));
        }
        if (this.props.onVisibleMonthsChange) {
          this.props.onVisibleMonthsChange([xdateToData(currMont)]);
        }
      }
    });
  }

  _handleDayInteraction(date, interaction) {
    const day = parseDate(date);
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);
    if (!(minDate && !dateutils.isGTE(day, minDate)) && !(maxDate && !dateutils.isLTE(day, maxDate))) {
      const shouldUpdateMonth = this.props.disableMonthChange === undefined || !this.props.disableMonthChange;
      if (shouldUpdateMonth) {
        this.updateMonth(day);
      }
      if (interaction) {
        interaction(xdateToData(day));
      }
    }
  }

  pressDay(date) {
    this._handleDayInteraction(date, this.props.onDayPress);
  }

  longPressDay(date) {
    this._handleDayInteraction(date, this.props.onDayLongPress);
  }

  addMonth(count) {
    this.updateMonth(this.state.currentMonth.clone().addMonths(count, true));
  }

  renderDay(day, id) {
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);
    let state = '';
    if (this.props.disabledByDefault) {
      state = 'disabled';
    } else if ((minDate && !dateutils.isGTE(day, minDate)) || (maxDate && !dateutils.isLTE(day, maxDate))) {
      state = 'disabled';
    } else if (!dateutils.sameMonth(day, this.state.currentMonth)) {
      state = 'disabled';
    } else if (dateutils.sameDate(day, XDate())) {
      state = 'today';
    }
    let dayComp;
    if (!dateutils.sameMonth(day, this.state.currentMonth) && this.props.hideExtraDays) {
      if (['period', 'multi-period'].includes(this.props.markingType)) {
        dayComp = (<View key={id} style={{flex: 1}}/>);
      } else {
        dayComp = (<View key={id} style={this.style.dayContainer}/>);
      }
    } else {
      const DayComp = this.getDayComponent();
      const date = day.toString('dd');
      dayComp = (
          <DayComp
              key={id}
              state={state}
              theme={this.props.theme}
              onPress={this.pressDay}
              onLongPress={this.longPressDay}
              date={xdateToData(day)}
              marking={this.getDateMarking(day)}
          >
            {date}
          </DayComp>
      );
    }
    return dayComp;
  }

  getDayComponent() {
    if (this.props.dayComponent) {
      return this.props.dayComponent;
    }

    switch (this.props.markingType) {
      case 'period':
        return UnitDay;
      case 'multi-dot':
        return MultiDotDay;
      case 'multi-period':
        return MultiPeriodDay;
      case 'custom':
        return SingleDay;
      default:
        return Day;
    }
  }

  getDateMarking(day) {
    if (!this.props.markedDates) {
      return false;
    }
    const dates = this.props.markedDates[day.toString('yyyy-MM-dd')] || EmptyArray;
    if (dates.length || dates) {
      return dates;
    } else {
      return false;
    }
  }

  renderWeekNumber (weekNumber) {
    return <Day key={`week-${weekNumber}`} theme={this.props.theme} marking={{disableTouchEvent: true}} state='disabled'>{weekNumber}</Day>;
  }

  renderWeek(days, id) {
    const week = [];
    days.forEach((day, id2) => {
      week.push(this.renderDay(day, id2));
    }, this);

    if (this.props.showWeekNumbers) {
      week.unshift(this.renderWeekNumber(days[days.length - 1].getWeek()));
    }
    const result = [
      <View style={this.style.week}>{week}</View>,
    ];
    const events = this.currentEvents;
    if (events && events.length > 0) {
      let weekWeight = 7;
      let hasWeekStart = false;
      let hasWeekEnd = false;
      const currentMonth = this.state.currentMonth.clone();
      const startMonth = currentMonth.clone().setDate(1);
      const endMonth = startMonth.clone().addMonths(1).addDays(-1);
      const isStartMonth = startMonth.getDay() !== 0
          && startMonth.getWeek() - 1 === days[0].getWeek();
      const isEndMonth = (endMonth.getDay() !== 6 && endMonth.getDay() !== 0
          && endMonth.getWeek() === days[days.length - 1].getWeek()) ||
          (endMonth.getDay() === 0 && endMonth.getWeek() + 1 === days[days.length - 1].getWeek())
      const eventsThisWeek = events.filter((event) => {
            const startDate = parseDate(event.start);
            const endDate = parseDate(event.end);
            let [ weekStart, weekEnd ] = [startDate, endDate].map((date) => date.getWeek());
            let [currentStartWeek, currentEndWeek] = [days[0], days[days.length - 1]].map((date) => date.getWeek());
            if (startDate.getDay() === 0) {
              weekStart += 1;
            }
            if (endDate.getDay() === 0) {
              weekEnd += 1;
            }
            const weekRange = Array(Math.abs(weekStart - weekEnd) + 1).fill().map((item, index)=> index + weekStart);
            return weekRange.includes(currentEndWeek);
          })
              .reduce((all, event) => {
                let start = parseDate(event.start);
                let end = parseDate(event.end);
                let startBeforeTheWeek = false;
                let endAfterTheWeek = false;
                let weight = 0;
                if (
                    isStartMonth
                    && start.getTime() < startMonth.getTime()
                ) {
                  start = startMonth;
                  weight += 0.5;
                }
                if (
                    isEndMonth
                    && end.getTime() > endMonth.getTime()
                ) {
                  end = endMonth;
                  weight += 0.5;
                }
                if (start.getTime() < days[0].getTime()) {
                  startBeforeTheWeek = true;
                  start = days[0];
                  weight += 0.5;
                }
                if (end.getTime() > days[days.length - 1].getTime()) {
                  endAfterTheWeek = true;
                  end = days[days.length - 1];
                  weight += 0.5;
                }
                // add gap in between if the end date of last reservation is not the same as the start date
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
              }, [])
      ;
      if (eventsThisWeek.length > 0) {
        const eventStyle = {
          flexDirection: 'row',
          position: 'absolute',
          top: 25,
        };
        const eventStart = parseDate(eventsThisWeek[0].start);
        const eventEnd = parseDate(eventsThisWeek[eventsThisWeek.length - 1].end);
        // need to fill out the white blank if available
        ;
        let cellBefore = isStartMonth ? startMonth.getDay() : 0;
        let cellAfter =  isEndMonth ? 6 - endMonth.getDay() : 0;
        const weekStartTime = !isStartMonth ? days[0] : startMonth;
        const weekEndTime = !isEndMonth ? days[days.length - 1] : endMonth;
        if (weekWeight > 0) {
          if (eventStart.getTime() >= weekStartTime.getTime()) {
            cellBefore += 0.5;
            weekWeight -= 0.5;
          }
          if (eventEnd.getTime() <= weekEndTime.getTime()
          ) {
            cellAfter += 0.5;
            weekWeight -= 0.5;
          }
          if (eventStart.getTime() > weekStartTime.getTime()) {
            const diffStart = Math.abs(eventStart.diffDays(weekStartTime));
            cellBefore += diffStart;
            weekWeight -= diffStart;
          }
          if (eventEnd.getTime() < weekEndTime.getTime()) {
            const diffEnd = Math.abs(eventEnd.diffDays(weekEndTime))
            cellAfter += diffEnd;
            weekWeight -= diffEnd;
          }
        }
        result.push(
            (<View style={eventStyle}>
              {cellBefore > 0 && <View style={{ flex : cellBefore, minHeight: 10, zIndex: -1 }} />}
              {eventsThisWeek.map((item) => item.isGap ? (<View style={{ flex: item.weight, minHeight: 10 }}/>) :
                  <View
                      key={`booking-${item.reservation.booking_id}`}
                      style={[
                        { flex: item.weight, top: -20, minHeight: 25 },
                        item.currentEdit ? { zIndex: -1, opacity: 0.5,
                          top: Platform.OS === 'android' ? -20 : 0,
                          height: Platform.OS === 'android' ? 30 : 10,
                        } : null,
                      ]}
                  >
                    <TouchableOpacity
                        style={[
                          this.style.markerContainer,
                          {backgroundColor: item.color, minHeight: 30},
                          this.style.marker,
                          item.weekStart === days[0].getWeek() && parseDate(item.start).getMonth() === this.state.currentMonth.getMonth() ? this.style.markerStart : null,
                          item.weekEnd === days[days.length - 1].getWeek() && parseDate(item.end).getMonth() === this.state.currentMonth.getMonth() ? this.style.markerEnd : null,
                        ]}
                        onPress={() => this.props.onMarkerPress(item)}
                    >
                      {item.weekStart === days[0].getWeek() && item.flagAt[1] === this.state.currentMonth.getMonth() ? item.before : null}
                      <Text style={this.style.markerText}>
                        {item.weight > 1.5 ? (item.showTextAt === days[0].getWeek() + 1  ?
                            (item.shouldEllipsis ? ` ` : item.text) : ' ')
                            : ' '
                        }
                      </Text>
                      {item.weekEnd === days[days.length - 1].getWeek() ? item.after : null}
                    </TouchableOpacity>
                  </View>
              )}
              {cellAfter > 0 && <View style={{ flex : cellAfter, minHeight: 10, zIndex: -1 }} />}
            </View>)
        );
      }
    }

    return (<View style={this.style.weekContainer} key={id}>{result}</View>);
  }

  render() {
    const days = dateutils.page(this.state.currentMonth, this.props.firstDay);
    const weeks = [];
    while (days.length) {
      weeks.push(this.renderWeek(days.splice(0, 7), weeks.length));
    }
    let indicator;
    const current = parseDate(this.props.current);
    if (current) {
      const lastMonthOfDay = current.clone().addMonths(1, true).setDate(1).addDays(-1).toString('yyyy-MM-dd');
      if (this.props.displayLoadingIndicator &&
          !(this.props.markedDates && this.props.markedDates[lastMonthOfDay])) {
        indicator = true;
      }
    }
    return (
        <View style={[this.style.container, this.props.style]}>
          <CalendarHeader
              theme={this.props.theme}
              hideArrows={this.props.hideArrows}
              month={this.state.currentMonth}
              addMonth={this.addMonth}
              showIndicator={indicator}
              firstDay={this.props.firstDay}
              renderArrow={this.props.renderArrow}
              monthFormat={this.props.monthFormat}
              hideDayNames={this.props.hideDayNames}
              weekNumbers={this.props.showWeekNumbers}
              onPressArrowLeft={this.props.onPressArrowLeft}
              onPressArrowRight={this.props.onPressArrowRight}
          />
          <View style={this.style.monthView}>{weeks}</View>
        </View>);
  }
}

export default Calendar;
