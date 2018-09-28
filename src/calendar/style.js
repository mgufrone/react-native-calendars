import {StyleSheet} from 'react-native';
import * as defaultStyle from '../style';

const STYLESHEET_ID = 'stylesheet.calendar.main';

export default function getStyle(theme={}) {
  const appStyle = {...defaultStyle, ...theme};
  return StyleSheet.create({
    container: {
      paddingLeft: 5,
      paddingRight: 5,
      backgroundColor: appStyle.calendarBackground
    },
    monthView: {
      backgroundColor: appStyle.calendarBackground
    },
    week: {
      marginTop: 7,
      marginBottom: 7,
      flexDirection: 'row',
      justifyContent: 'space-around'
    },
    dayContainer: {
      width: 32
    },
    marker: {
      padding: 3,
      flexDirection: 'row',
      marginVertical: 1,
    },
    markerText: {
      fontSize: 13,
      color: '#fff',
    },
    markerStart: {
      borderTopLeftRadius: 5,
    },
    markerEnd: {
      borderBottomRightRadius: 5,
    },
    ...(theme[STYLESHEET_ID] || {})
  });
}

