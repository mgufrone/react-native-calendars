import {StyleSheet} from 'react-native';
import * as defaultStyle from '../style';
import {Theme} from '../types';

export default function getStyle(theme: Theme = {}) {
  const appStyle = {...defaultStyle, ...theme};
  return StyleSheet.create({
    container: {
      paddingLeft: 5,
      paddingRight: 5,
      backgroundColor: appStyle.calendarBackground
    },
    dayContainer: {
      flex: 1,
      alignItems: 'center'
    },
    emptyDayContainer: {
      flex: 1
    },
    monthView: {
      backgroundColor: appStyle.calendarBackground
    },
    week: {
      marginVertical: appStyle.weekVerticalMargin,
      flexDirection: 'row',
      justifyContent: 'space-around'
    },
    marker: {
      width: '100%',
      height: 18,
      borderRadius: 2,
      justifyContent: 'center',
      paddingHorizontal: 2,
      marginTop: 1,
      marginBottom: 1
    },
    markerText: {
      color: 'white',
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'left'
    },
    ...(theme['stylesheet.calendar.main'] || {})
  });
}
