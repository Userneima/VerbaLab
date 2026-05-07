export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
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
        iconPath: 'assets/tab/expression.png',
        selectedIconPath: 'assets/tab/expression-active.png',
      },
      {
        pagePath: 'pages/vocab-review/index',
        text: '工坊',
        iconPath: 'assets/tab/workshop.png',
        selectedIconPath: 'assets/tab/workshop-active.png',
      },
      {
        pagePath: 'pages/library/index',
        text: '资产',
        iconPath: 'assets/tab/assets.png',
        selectedIconPath: 'assets/tab/assets-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab/profile.png',
        selectedIconPath: 'assets/tab/profile-active.png',
      },
    ],
  },
});
