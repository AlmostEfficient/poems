import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefefe',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    fontStyle: 'italic',
  },
  verticalPager: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
  verticalPage: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
  },
  poemContainer: {
    flex: 1,
    paddingHorizontal: 35,
    paddingVertical: 60,
  },
  pager: {
    flex: 1,
  },
  pagerPage: {
    flex: 1,
  },
  poemPage: {
    flex: 1,
    justifyContent: 'space-between',
  },
  poemHeader: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2c2c2c',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'serif',
  },
  author: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  poemBody: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  stanza: {
    marginBottom: 24,
    width: '100%',
  },
  line: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333',
    marginBottom: 2,
    fontFamily: 'serif',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#666',
  },
}); 