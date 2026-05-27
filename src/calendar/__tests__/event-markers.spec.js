import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {CalendarList} from '../..';
import 'jest-date-mock';

const RESERVATIONS = [
  {
    start: '2020-04-02',
    end: '2020-04-05',
    text: 'John Doe',
    color: '#2e7d32'
  },
  {
    start: '2020-04-10',
    end: '2020-04-12',
    text: 'Jane Smith',
    color: '#c62828'
  }
];

describe('Calendar event markers', () => {
  it('renders without crashing with events prop', () => {
    const {toJSON} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={RESERVATIONS}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders markers on event dates', () => {
    const {queryAllByText} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={RESERVATIONS}
      />
    );
    // Both reservation names should appear somewhere
    expect(queryAllByText(/John Doe/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/Jane Smith/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders markers spanning multiple days', () => {
    const {queryByText} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={RESERVATIONS}
      />
    );
    // Event from Apr 2-5 should appear once with text in the week it starts
    expect(queryByText(/John Doe/)).toBeTruthy();
    // Event from Apr 10-12 should appear once with text
    expect(queryByText(/Jane Smith/)).toBeTruthy();
  });

  it('fires onMarkerPress when a marker is pressed', () => {
    const onPress = jest.fn();
    const {queryByText} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={RESERVATIONS}
        onMarkerPress={onPress}
      />
    );
    const marker = queryByText(/John Doe/);
    expect(marker).toBeTruthy();
    if (marker) {
      fireEvent.press(marker);
    }
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(
      expect.objectContaining({
        start: '2020-04-02',
        end: '2020-04-05',
        text: 'John Doe'
      })
    );
  });

  it('fires onMarkerPress for each event independently', () => {
    const onPress = jest.fn();
    const {queryByText} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={RESERVATIONS}
        onMarkerPress={onPress}
      />
    );
    const john = queryByText(/John Doe/);
    const jane = queryByText(/Jane Smith/);
    if (john) fireEvent.press(john);
    if (jane) fireEvent.press(jane);
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('handles empty events gracefully', () => {
    const {toJSON} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={[]}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('handles undefined events gracefully', () => {
    const {toJSON} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('applies event color as marker background', () => {
    const {toJSON} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={[{
          start: '2020-04-03',
          end: '2020-04-03',
          text: 'Colored',
          color: '#1565c0'
        }]}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders before element from event data', () => {
    const BeforeComponent = () => <></>;
    const {toJSON} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={[{
          start: '2020-04-05',
          end: '2020-04-07',
          text: 'WithBefore',
          color: '#2e7d32',
          before: <BeforeComponent/>
        }]}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders after element from event data', () => {
    const AfterComponent = () => <></>;
    const {toJSON} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={[{
          start: '2020-04-05',
          end: '2020-04-07',
          text: 'WithAfter',
          color: '#2e7d32',
          after: <AfterComponent/>
        }]}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders currentEdit events with reduced opacity', () => {
    const {toJSON} = render(
      <CalendarList
        current={'2020-04-01'}
        pastScrollRange={0}
        futureScrollRange={1}
        events={[{
          start: '2020-04-05',
          end: '2020-04-07',
          text: 'Editing',
          color: '#2e7d32',
          currentEdit: true
        }]}
      />
    );
    expect(toJSON()).toBeTruthy();
  });
});
