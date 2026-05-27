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
    weekContainer: {
      marginTop: 7,
      marginBottom: 7,
    },
    week: {
      marginVertical: appStyle.weekVerticalMargin,
      flexDirection: 'row',
      justifyContent: 'space-around'
    },
    marker: {
      flexDirection: 'row',
    },
    markerContainer: {
      flex: 1,
      paddingVertical: 3,
      paddingHorizontal: 2,
    },
    markerText: {
      fontSize: 14,
      marginLeft: 2,
      color: '#fff',
    },
    markerStart: {
      borderBottomLeftRadius: 5,
      marginLeft: 9,
    },
    markerEnd: {
      borderTopRightRadius: 5,
      marginRight: 9,
    },
    ...(theme['stylesheet.calendar.main'] || {})
  });
}
