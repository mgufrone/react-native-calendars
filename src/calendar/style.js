import {StyleSheet, Dimensions} from 'react-native';

import * as defaultStyle from '../style';

const STYLESHEET_ID = 'stylesheet.calendar.main';
const { width } = Dimensions.get('window');

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
    weekContainer: {
      marginTop: 7,
      marginBottom: 7,
    },
    week: {
      flexDirection: 'row',
      justifyContent: 'space-around'
    },
    dayContainer: {
      width: 32
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
    ...(theme[STYLESHEET_ID] || {})
  });
}

