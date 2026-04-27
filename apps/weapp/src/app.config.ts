export default defineAppConfig({
  pages: [
    'pages/expression-helper/index',
    'pages/vocab-review/index',
    'pages/library/index',
    'pages/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: 'VerbaLab',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#667085',
    selectedColor: '#0f9f6e',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/expression-helper/index',
        text: '表达',
      },
      {
        pagePath: 'pages/vocab-review/index',
        text: '词卡',
      },
      {
        pagePath: 'pages/library/index',
        text: '语料',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
      },
    ],
  },
});
